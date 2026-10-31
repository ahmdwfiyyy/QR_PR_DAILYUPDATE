import calendar
from collections import defaultdict
from datetime import date, datetime
from pathlib import Path

from fastapi import FastAPI, File, Form, HTTPException, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from .db import connect, init_db
from .parser import ParseError, parse_date_param, parse_pr, parse_qr

DATASETS = {"PR": "PR", "BU": "QR", "BV": "QR"}  # dataset -> snapshot kind
DATASET_LABELS = {"PR": "PR Open", "BU": "QR Buyer Update", "BV": "QR Buyer Verify"}
AGED_DAYS = 3  # items older than this many days are flagged (keep in sync with frontend/src/api.js)
ITEM_COLUMNS = [
    "dataset", "doc_no", "doc_date", "description", "category", "category_raw", "buyer", "buyer_raw",
    "requestor", "department", "approver", "status", "aging_days", "vendor", "total_price", "currency",
    "cost_block", "cer_no", "mer_no", "expenditure_type", "last_operate", "submission_date",
]

app = FastAPI(title="Daily Update QR & PR")
app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:5173"], allow_methods=["*"], allow_headers=["*"])
init_db()


# ---------------------------------------------------------------- helpers

def _check_dataset(dataset):
    dataset = dataset.upper()
    if dataset not in DATASETS:
        raise HTTPException(400, f"Unknown dataset '{dataset}'. Use PR, BU or BV.")
    return dataset


def _snapshot(conn, kind, on_date=None):
    """Snapshot row for kind on a date (latest if date is None)."""
    if on_date:
        return conn.execute("SELECT * FROM snapshots WHERE kind=? AND snapshot_date=?", (kind, on_date)).fetchone()
    return conn.execute("SELECT * FROM snapshots WHERE kind=? ORDER BY snapshot_date DESC LIMIT 1", (kind,)).fetchone()


def _previous_snapshot(conn, kind, before):
    return conn.execute(
        "SELECT * FROM snapshots WHERE kind=? AND snapshot_date<? ORDER BY snapshot_date DESC LIMIT 1", (kind, before)
    ).fetchone()


def _items(conn, snapshot_id, dataset):
    rows = conn.execute(
        "SELECT * FROM items WHERE snapshot_id=? AND dataset=? ORDER BY aging_days DESC, doc_no", (snapshot_id, dataset)
    ).fetchall()
    return [dict(r) for r in rows]


def _doc_set(conn, snapshot, dataset):
    if snapshot is None:
        return None
    rows = conn.execute("SELECT doc_no FROM items WHERE snapshot_id=? AND dataset=?", (snapshot["id"], dataset))
    return {r["doc_no"] for r in rows}


def _require_snapshot(conn, dataset, on_date):
    snap = _snapshot(conn, DATASETS[dataset], on_date)
    if snap is None:
        raise HTTPException(404, f"No {DATASETS[dataset]} upload found" + (f" for {on_date}" if on_date else ""))
    return snap


def _store(kind, parsed, snapshot_date, filename):
    if not parsed["items"]:
        raise ParseError(f"{kind} file contains no rows.")
    with connect() as conn:
        existing = _snapshot(conn, kind, snapshot_date)
        if existing:
            conn.execute("DELETE FROM snapshots WHERE id=?", (existing["id"],))
        cur = conn.execute(
            "INSERT INTO snapshots (kind, snapshot_date, filename, uploaded_at) VALUES (?,?,?,?)",
            (kind, snapshot_date, filename, datetime.now().isoformat(timespec="seconds")),
        )
        snapshot_id = cur.lastrowid
        cols = ["snapshot_id"] + ITEM_COLUMNS
        conn.executemany(
            f"INSERT INTO items ({','.join(cols)}) VALUES ({','.join('?' * len(cols))})",
            [[snapshot_id] + [item.get(c) for c in ITEM_COLUMNS] for item in parsed["items"]],
        )
    counts = defaultdict(int)
    for item in parsed["items"]:
        counts[item["dataset"]] += 1
    return {"kind": kind, "date": snapshot_date, "filename": filename, "replaced": existing is not None,
            "counts": dict(counts), "sheets": parsed["sheets"]}


# ---------------------------------------------------------------- endpoints

@app.post("/api/upload")
async def upload(
    pr_file: UploadFile | None = File(None),
    qr_file: UploadFile | None = File(None),
    snapshot_date: str | None = Form(None),
):
    if not pr_file and not qr_file:
        raise HTTPException(400, "Choose at least one file to upload.")
    try:
        override = parse_date_param(snapshot_date)
        jobs = []
        for kind, upload_file, parser in (("PR", pr_file, parse_pr), ("QR", qr_file, parse_qr)):
            if not upload_file or not upload_file.filename:
                continue
            parsed = parser(await upload_file.read(), upload_file.filename)
            the_date = override or parsed["date"]
            if the_date is None:
                raise ParseError(f"Could not detect the date for the {kind} file. Please pick the date manually.")
            jobs.append((kind, parsed, the_date.isoformat(), upload_file.filename))
        # parse everything first so a bad file doesn't leave a half-finished upload
        return {"results": [_store(*job) for job in jobs]}
    except ParseError as exc:
        raise HTTPException(400, str(exc)) from exc


@app.get("/api/snapshots")
def snapshots():
    by_date = defaultdict(dict)
    with connect() as conn:
        rows = conn.execute("""
            SELECT s.*, i.dataset, COUNT(i.id) AS n FROM snapshots s
            LEFT JOIN items i ON i.snapshot_id = s.id
            GROUP BY s.id, i.dataset ORDER BY s.snapshot_date DESC
        """).fetchall()
    for r in rows:
        entry = by_date[r["snapshot_date"]].setdefault(
            r["kind"], {"filename": r["filename"], "uploaded_at": r["uploaded_at"], "counts": {}}
        )
        if r["dataset"]:
            entry["counts"][r["dataset"]] = r["n"]
    return [{"date": d, **kinds} for d, kinds in sorted(by_date.items(), reverse=True)]


@app.delete("/api/snapshots/{kind}/{snapshot_date}")
def delete_snapshot(kind: str, snapshot_date: str):
    with connect() as conn:
        cur = conn.execute("DELETE FROM snapshots WHERE kind=? AND snapshot_date=?", (kind.upper(), snapshot_date))
    if cur.rowcount == 0:
        raise HTTPException(404, "Snapshot not found")
    return {"deleted": True}


@app.get("/api/overview")
def overview(on_date: str | None = Query(None, alias="date"), aged_days: int = AGED_DAYS):
    """Headline numbers per dataset + per-buyer counts for one day (latest by default)."""
    with connect() as conn:
        if on_date is None:
            latest = conn.execute("SELECT MAX(snapshot_date) AS d FROM snapshots").fetchone()["d"]
            if latest is None:
                return {"date": None, "datasets": {}, "buyers": []}
            on_date = latest
        datasets, per_buyer = {}, defaultdict(lambda: {d: None for d in DATASETS})
        for dataset, kind in DATASETS.items():
            snap = _snapshot(conn, kind, on_date)
            if snap is None:
                datasets[dataset] = None
                continue
            items = _items(conn, snap["id"], dataset)
            docs = {i["doc_no"] for i in items}
            prev = _previous_snapshot(conn, kind, on_date)
            prev_docs = _doc_set(conn, prev, dataset)
            datasets[dataset] = {
                "label": DATASET_LABELS[dataset],
                "total": len(items),
                "aged": sum(1 for i in items if (i["aging_days"] or 0) > aged_days),
                "oldest": max((i["aging_days"] or 0 for i in items), default=0),
                "prev_date": prev["snapshot_date"] if prev else None,
                "prev_total": len(prev_docs) if prev_docs is not None else None,
                "new": len(docs - prev_docs) if prev_docs is not None else None,
                "cleared": len(prev_docs - docs) if prev_docs is not None else None,
            }
            for i in items:
                bucket = per_buyer[i["buyer"] or "(none)"]
                bucket[dataset] = (bucket[dataset] or 0) + 1
    # 0 where the dataset was uploaded but the buyer has nothing; None where the dataset wasn't uploaded
    for counts in per_buyer.values():
        for dataset in DATASETS:
            if counts[dataset] is None and datasets[dataset] is not None:
                counts[dataset] = 0
    buyers = [{"buyer": b, **counts} for b, counts in sorted(per_buyer.items())]
    return {"date": on_date, "aged_days": aged_days, "datasets": datasets, "buyers": buyers}


@app.get("/api/summary")
def summary(dataset: str, on_date: str | None = Query(None, alias="date")):
    """Same two pivots as the Excel *_SUMMARY sheets: buyer x aging days, and buyer -> category."""
    dataset = _check_dataset(dataset)
    with connect() as conn:
        snap = _require_snapshot(conn, dataset, on_date)
        items = _items(conn, snap["id"], dataset)
    aging_cols = sorted({i["aging_days"] for i in items if i["aging_days"] is not None})
    matrix = defaultdict(lambda: defaultdict(int))
    categories = defaultdict(lambda: defaultdict(int))
    for i in items:
        buyer = i["buyer"] or "(none)"
        matrix[buyer][i["aging_days"]] += 1
        categories[buyer][i["category"] or "(none)"] += 1
    buyers = [
        {"buyer": b, "counts": {str(k): v for k, v in matrix[b].items()}, "total": sum(matrix[b].values())}
        for b in sorted(matrix)
    ]
    column_totals = defaultdict(int)
    for b in buyers:
        for k, v in b["counts"].items():
            column_totals[k] += v
    return {
        "dataset": dataset,
        "label": DATASET_LABELS[dataset],
        "date": snap["snapshot_date"],
        "aging_columns": aging_cols,
        "buyers": buyers,
        "column_totals": dict(column_totals),
        "total": len(items),
        "categories": [
            {"buyer": b, "total": sum(c.values()),
             "categories": [{"category": k, "count": v} for k, v in sorted(c.items())]}
            for b, c in sorted(categories.items())
        ],
    }


@app.get("/api/items")
def items(dataset: str, on_date: str | None = Query(None, alias="date")):
    """Raw rows for one dataset/day; is_new = not present in the previous upload."""
    dataset = _check_dataset(dataset)
    with connect() as conn:
        snap = _require_snapshot(conn, dataset, on_date)
        rows = _items(conn, snap["id"], dataset)
        prev = _previous_snapshot(conn, DATASETS[dataset], snap["snapshot_date"])
        prev_docs = _doc_set(conn, prev, dataset)
        cleared = []
        if prev is not None:
            current = {r["doc_no"] for r in rows}
            cleared = [r for r in _items(conn, prev["id"], dataset) if r["doc_no"] not in current]
    for r in rows:
        r["is_new"] = prev_docs is not None and r["doc_no"] not in prev_docs
    return {"dataset": dataset, "date": snap["snapshot_date"], "prev_date": prev["snapshot_date"] if prev else None,
            "items": rows, "cleared": cleared}


@app.get("/api/months")
def months():
    with connect() as conn:
        rows = conn.execute("SELECT DISTINCT substr(snapshot_date,1,7) AS m FROM snapshots ORDER BY m DESC").fetchall()
    return [r["m"] for r in rows]


@app.get("/api/trend")
def trend(dataset: str, month: str | None = None):
    """Per-buyer count for every day of a month (like the old monthly Summary sheet) + Avg/day."""
    dataset = _check_dataset(dataset)
    kind = DATASETS[dataset]
    with connect() as conn:
        if month is None:
            latest = _snapshot(conn, kind)
            if latest is None:
                raise HTTPException(404, f"No {kind} uploads yet")
            month = latest["snapshot_date"][:7]
        rows = conn.execute("""
            SELECT s.snapshot_date AS d, COALESCE(i.buyer,'(none)') AS buyer, COUNT(i.id) AS n
            FROM snapshots s LEFT JOIN items i ON i.snapshot_id = s.id AND i.dataset = ?
            WHERE s.kind = ? AND substr(s.snapshot_date,1,7) = ?
            GROUP BY s.snapshot_date, buyer
        """, (dataset, kind, month)).fetchall()
    try:
        year, mon = map(int, month.split("-"))
        days = [date(year, mon, d).isoformat() for d in range(1, calendar.monthrange(year, mon)[1] + 1)]
    except ValueError as exc:
        raise HTTPException(400, "month must be YYYY-MM") from exc

    snapshot_days = sorted({r["d"] for r in rows})
    counts = defaultdict(dict)
    for r in rows:
        if r["n"]:
            counts[r["buyer"]][r["d"]] = r["n"]

    def series(values_by_day):
        values = {d: (values_by_day.get(d, 0) if d in snapshot_days else None) for d in days}
        present = [v for v in values.values() if v is not None]
        return values, (round(sum(present) / len(present), 1) if present else None)

    buyers = []
    for buyer in sorted(counts):
        values, avg = series(counts[buyer])
        buyers.append({"buyer": buyer, "values": values, "avg": avg})
    total_by_day = defaultdict(int)
    for c in counts.values():
        for d, n in c.items():
            total_by_day[d] += n
    total_values, total_avg = series(total_by_day)
    return {"dataset": dataset, "label": DATASET_LABELS[dataset], "month": month, "days": days,
            "snapshot_days": snapshot_days, "buyers": buyers, "total": {"values": total_values, "avg": total_avg}}


# ---------------------------------------------------------------- serve built frontend (production)

DIST = Path(__file__).resolve().parents[2] / "frontend" / "dist"
if DIST.exists():
    app.mount("/assets", StaticFiles(directory=DIST / "assets"), name="assets")

    @app.get("/{path:path}", include_in_schema=False)
    def spa(path: str):
        target = DIST / path
        return FileResponse(target if path and target.is_file() else DIST / "index.html")
