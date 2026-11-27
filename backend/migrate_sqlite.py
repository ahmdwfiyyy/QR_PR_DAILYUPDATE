"""One-time copy of uploads from the old SQLite database (before the move to Docker + PostgreSQL).

Run it on this PC with the Docker database up (`docker compose up -d db`):

    cd backend
    .venv/Scripts/python migrate_sqlite.py data/app.db

DATABASE_URL defaults to the Docker database on localhost:5433. Days that already exist in the new
database are skipped, so it is safe to run twice. Names are copied exactly as they were mapped back then.
"""
import sqlite3
import sys
from datetime import date, datetime, timezone
from decimal import Decimal
from pathlib import Path

from sqlalchemy import select

from app.db import SessionLocal
from app.models import Item, Snapshot

ITEM_COLUMNS = [
    "dataset", "doc_no", "doc_date", "description", "category", "category_raw", "buyer", "buyer_raw",
    "requestor", "department", "approver", "status", "aging_days", "vendor", "total_price", "currency",
    "cost_block", "cer_no", "mer_no", "expenditure_type", "last_operate", "submission_date",
]
DATE_COLUMNS = {"doc_date", "submission_date"}


def _date(value) -> date | None:
    return date.fromisoformat(value[:10]) if value else None


def _convert(column: str, value):
    if column in DATE_COLUMNS:
        return _date(value)
    if column == "total_price" and value is not None:
        return Decimal(str(value)).quantize(Decimal("0.01"))
    return value


def migrate(path: Path) -> None:
    old = sqlite3.connect(path)
    old.row_factory = sqlite3.Row
    snapshots = old.execute("SELECT * FROM snapshots ORDER BY snapshot_date, kind").fetchall()
    copied = skipped = 0
    with SessionLocal() as db:
        for row in snapshots:
            day = _date(row["snapshot_date"])
            label = f"{row['kind']} {day}"
            exists = db.scalar(select(Snapshot.id).where(Snapshot.kind == row["kind"], Snapshot.snapshot_date == day))
            if exists:
                print(f"  {label}: already in the new database, skipped")
                skipped += 1
                continue
            uploaded = datetime.fromisoformat(row["uploaded_at"])
            if uploaded.tzinfo is None:  # the old app stored local time without a zone
                uploaded = uploaded.astimezone(timezone.utc)
            snapshot = Snapshot(kind=row["kind"], snapshot_date=day, filename=row["filename"], uploaded_at=uploaded)
            items = old.execute("SELECT * FROM items WHERE snapshot_id = ?", (row["id"],)).fetchall()
            snapshot.items = [Item(**{c: _convert(c, item[c]) for c in ITEM_COLUMNS}) for item in items]
            db.add(snapshot)
            counts = {}
            for item in items:
                counts[item["dataset"]] = counts.get(item["dataset"], 0) + 1
            print(f"  {label}: copied {', '.join(f'{n} {k}' for k, n in sorted(counts.items()))}")
            copied += 1
        db.commit()
    old.close()
    print(f"Done: {copied} upload(s) copied, {skipped} skipped.")


if __name__ == "__main__":
    if len(sys.argv) != 2 or not Path(sys.argv[1]).is_file():
        sys.exit("Usage: python migrate_sqlite.py <path to old app.db>")
    migrate(Path(sys.argv[1]))
