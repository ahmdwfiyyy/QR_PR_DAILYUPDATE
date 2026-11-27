"""Create fake demo uploads (made-up buyers and documents) for the last two weeks of working days.

    docker compose exec backend python seed.py           # only if the database is empty
    docker compose exec backend python seed.py --reset   # wipe ALL uploads first, then seed

Useful for trying the app or showing it without real company data.
"""
import random
import sys
from datetime import timedelta
from decimal import Decimal

from sqlalchemy import select

from app.core.config import today
from app.db import Base, SessionLocal, engine
from app.models import Dataset, Snapshot, SnapshotKind
from app.services.excel import ParsedFile
from app.services.snapshots import store_snapshot

BUYERS = ["Buyer A", "Buyer B", "Buyer C", "Buyer D", "Buyer E"]
CATEGORIES = ["OEM", "Non-OEM", "Hardware/Electrical", "Facility/Housekeeping", "Board Repair", "IT"]
DAYS = 10  # working days


def wipe() -> None:
    with engine.begin() as conn:
        for table in reversed(Base.metadata.sorted_tables):
            conn.execute(table.delete())
    print("All uploads deleted.")


def working_days(count: int):
    day = today()
    found = []
    while len(found) < count:
        if day.weekday() < 5:
            found.append(day)
        day -= timedelta(days=1)
    return sorted(found)


def fake_item(rng: random.Random, dataset: Dataset, number: int, opened, on_day) -> dict:
    prefix = {"PR": "DEMO-PR", "BU": "DEMO-QU", "BV": "DEMO-QV"}[dataset]
    return {
        "dataset": dataset,
        "doc_no": f"{prefix}-{number:05d}",
        "doc_date": opened,
        "description": f"Demo item {number}",
        "category": rng.choice(CATEGORIES),
        "buyer": rng.choice(BUYERS),
        "requestor": "Demo Requestor",
        "department": "Demo",
        "status": "OPEN" if dataset == Dataset.PR else f"Pending Buyer {'Update' if dataset == Dataset.BU else 'Verify'}",
        "aging_days": (on_day - opened).days,
        "vendor": "DEMO VENDOR SDN BHD",
        "total_price": Decimal(rng.randint(100, 50000)) if dataset == Dataset.PR else None,
        "currency": rng.choice(["RM", "RM", "USD"]) if dataset == Dataset.PR else None,
    }


def seed() -> None:
    rng = random.Random(42)
    days = working_days(DAYS)
    # Each document is opened on some day and closed a few days later; a snapshot lists what is open that day
    docs = []
    number = 0
    for dataset, per_day, life in ((Dataset.PR, 6, (1, 8)), (Dataset.BU, 2, (1, 6)), (Dataset.BV, 5, (3, 40))):
        start = days[0] - timedelta(days=life[1])
        day = start
        while day <= days[-1]:
            for _ in range(rng.randint(0, per_day)):
                number += 1
                docs.append((dataset, number, day, day + timedelta(days=rng.randint(*life))))
            day += timedelta(days=1)

    with SessionLocal() as db:
        if db.scalar(select(Snapshot.id).limit(1)) is not None:
            print("The database already has uploads. Run with --reset to replace them with demo data.")
            return
        for day in days:
            for kind in SnapshotKind:
                datasets = [Dataset.PR] if kind == SnapshotKind.PR else [Dataset.BU, Dataset.BV]
                items = [
                    fake_item(rng, ds, n, opened, day)
                    for ds, n, opened, closed in docs
                    if ds in datasets and opened <= day < closed
                ]
                if items:
                    store_snapshot(db, ParsedFile(kind, day, items), day, f"demo-{kind}-{day:%d%m%y}.xlsx")
        db.commit()
    print(f"Created demo uploads for {len(days)} working days ({days[0]} to {days[-1]}).")


if __name__ == "__main__":
    if "--reset" in sys.argv:
        wipe()
    seed()
