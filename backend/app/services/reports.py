"""Everything the dashboard shows, worked out from the stored snapshots.

The pivots here are the same as the *_SUMMARY sheets in the ERP files, so those sheets
never need refreshing before upload.
"""
import calendar
from collections import defaultdict
from datetime import date

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models import Dataset, Item, Snapshot
from app.schemas.reports import (
    BuyerAging,
    BuyerCategories,
    BuyerCounts,
    CategoryCount,
    DatasetHeadline,
    ItemOut,
    ItemsOut,
    Overview,
    Summary,
    Trend,
    TrendSeries,
    TrendTotal,
)
from app.services.errors import ServiceError
from app.services.snapshots import get_snapshot, latest_date, previous_snapshot, require_snapshot

NO_BUYER = "(none)"


def _items(db: Session, snapshot: Snapshot | None, dataset: Dataset) -> list[Item]:
    if snapshot is None:
        return []
    return list(
        db.scalars(
            select(Item)
            .where(Item.snapshot_id == snapshot.id, Item.dataset == dataset)
            .order_by(Item.aging_days.desc().nulls_last(), Item.doc_no)
        )
    )


def _doc_numbers(db: Session, snapshot: Snapshot | None, dataset: Dataset) -> set[str] | None:
    if snapshot is None:
        return None
    rows = db.scalars(select(Item.doc_no).where(Item.snapshot_id == snapshot.id, Item.dataset == dataset))
    return set(rows)


def _is_aged(item: Item, aged_days: int) -> bool:
    return (item.aging_days or 0) > aged_days


# --------------------------------------------------------------------------- dashboard
def overview(db: Session, on_date: date | None = None) -> Overview:
    """Headline numbers per dataset and per-buyer counts for one day (latest upload by default)."""
    aged_days = get_settings().aged_days
    on_date = on_date or latest_date(db)
    if on_date is None:
        return Overview(date=None, aged_days=aged_days, datasets={}, buyers=[])

    headlines: dict[str, DatasetHeadline | None] = {}
    per_buyer: dict[str, BuyerCounts] = {}
    for dataset in Dataset:
        snapshot = get_snapshot(db, dataset.kind, on_date)
        if snapshot is None:
            headlines[dataset] = None
            continue
        items = _items(db, snapshot, dataset)
        docs = {i.doc_no for i in items}
        prev = previous_snapshot(db, dataset.kind, on_date)
        prev_docs = _doc_numbers(db, prev, dataset)
        headlines[dataset] = DatasetHeadline(
            label=dataset.label,
            total=len(items),
            aged=sum(_is_aged(i, aged_days) for i in items),
            oldest=max((i.aging_days or 0 for i in items), default=0),
            prev_date=prev.snapshot_date if prev else None,
            prev_total=len(prev_docs) if prev_docs is not None else None,
            new=len(docs - prev_docs) if prev_docs is not None else None,
            cleared=len(prev_docs - docs) if prev_docs is not None else None,
        )
        for item in items:
            counts = per_buyer.setdefault(item.buyer or NO_BUYER, BuyerCounts(buyer=item.buyer or NO_BUYER))
            setattr(counts, dataset, (getattr(counts, dataset) or 0) + 1)

    # 0 where the file was uploaded but the buyer has nothing; null where the file is missing for the day
    for counts in per_buyer.values():
        for dataset in Dataset:
            if getattr(counts, dataset) is None and headlines[dataset] is not None:
                setattr(counts, dataset, 0)
    return Overview(
        date=on_date,
        aged_days=aged_days,
        datasets=headlines,
        buyers=sorted(per_buyer.values(), key=lambda b: b.buyer),
    )


# --------------------------------------------------------------------------- pivots
def summary(db: Session, dataset: Dataset, on_date: date | None = None) -> Summary:
    """Buyer x aging days, and buyer -> category: the two pivots on each *_SUMMARY sheet."""
    snapshot = require_snapshot(db, dataset, on_date)
    items = _items(db, snapshot, dataset)

    matrix: dict[str, dict[str, int]] = defaultdict(lambda: defaultdict(int))
    categories: dict[str, dict[str, int]] = defaultdict(lambda: defaultdict(int))
    column_totals: dict[str, int] = defaultdict(int)
    for item in items:
        buyer = item.buyer or NO_BUYER
        matrix[buyer][str(item.aging_days)] += 1
        categories[buyer][item.category or NO_BUYER] += 1
        column_totals[str(item.aging_days)] += 1

    return Summary(
        dataset=dataset,
        label=dataset.label,
        date=snapshot.snapshot_date,
        aged_days=get_settings().aged_days,
        aging_columns=sorted({i.aging_days for i in items if i.aging_days is not None}),
        buyers=[
            BuyerAging(buyer=b, counts=dict(matrix[b]), total=sum(matrix[b].values())) for b in sorted(matrix)
        ],
        column_totals=dict(column_totals),
        total=len(items),
        categories=[
            BuyerCategories(
                buyer=b,
                total=sum(c.values()),
                categories=[CategoryCount(category=k, count=v) for k, v in sorted(c.items())],
            )
            for b, c in sorted(categories.items())
        ],
    )


def items(db: Session, dataset: Dataset, on_date: date | None = None) -> ItemsOut:
    """Every item for one day. is_new = not in the previous upload; cleared = in the previous upload, gone now."""
    snapshot = require_snapshot(db, dataset, on_date)
    rows = _items(db, snapshot, dataset)
    prev = previous_snapshot(db, dataset.kind, snapshot.snapshot_date)
    prev_docs = _doc_numbers(db, prev, dataset)
    current = {r.doc_no for r in rows}

    out = []
    for row in rows:
        item = ItemOut.model_validate(row)
        item.is_new = prev_docs is not None and row.doc_no not in prev_docs
        out.append(item)
    cleared = [ItemOut.model_validate(r) for r in _items(db, prev, dataset) if r.doc_no not in current]
    return ItemsOut(
        dataset=dataset,
        date=snapshot.snapshot_date,
        prev_date=prev.snapshot_date if prev else None,
        aged_days=get_settings().aged_days,
        items=out,
        cleared=cleared,
    )


# --------------------------------------------------------------------------- monthly trend
def months(db: Session) -> list[str]:
    """Months (YYYY-MM) that have at least one upload, newest first."""
    dates = db.scalars(select(Snapshot.snapshot_date).distinct())
    return sorted({d.strftime("%Y-%m") for d in dates}, reverse=True)


def _month_days(month: str) -> list[date]:
    try:
        year, mon = map(int, month.split("-"))
        return [date(year, mon, d) for d in range(1, calendar.monthrange(year, mon)[1] + 1)]
    except ValueError as exc:
        raise ServiceError("month must look like YYYY-MM") from exc


def trend(db: Session, dataset: Dataset, month: str | None = None) -> Trend:
    """Per-buyer count for every day of a month, with Avg/day (like the old monthly Summary sheet)."""
    if month is None:
        latest = get_snapshot(db, dataset.kind)
        if latest is None:
            raise ServiceError(f"No {dataset.kind} uploads yet", 404)
        month = latest.snapshot_date.strftime("%Y-%m")
    days = _month_days(month)

    snapshot_days = sorted(
        db.scalars(
            select(Snapshot.snapshot_date).where(
                Snapshot.kind == dataset.kind, Snapshot.snapshot_date.between(days[0], days[-1])
            )
        )
    )
    rows = db.execute(
        select(Snapshot.snapshot_date, Item.buyer, func.count(Item.id))
        .join(Item, Item.snapshot_id == Snapshot.id)
        .where(
            Snapshot.kind == dataset.kind,
            Snapshot.snapshot_date.between(days[0], days[-1]),
            Item.dataset == dataset,
        )
        .group_by(Snapshot.snapshot_date, Item.buyer)
    )
    counts: dict[str, dict[date, int]] = defaultdict(dict)
    totals: dict[date, int] = defaultdict(int)
    for day, buyer, n in rows:
        counts[buyer or NO_BUYER][day] = n
        totals[day] += n

    uploaded = set(snapshot_days)

    def series(by_day: dict[date, int]) -> tuple[dict[str, int | None], float | None]:
        values = {d.isoformat(): (by_day.get(d, 0) if d in uploaded else None) for d in days}
        present = [v for v in values.values() if v is not None]
        return values, (round(sum(present) / len(present), 1) if present else None)

    buyers = []
    for buyer in sorted(counts):
        values, avg = series(counts[buyer])
        buyers.append(TrendSeries(buyer=buyer, values=values, avg=avg))
    total_values, total_avg = series(totals)
    return Trend(
        dataset=dataset,
        label=dataset.label,
        month=month,
        days=days,
        snapshot_days=snapshot_days,
        buyers=buyers,
        total=TrendTotal(values=total_values, avg=total_avg),
    )
