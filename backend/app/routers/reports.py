"""Dashboard, pivots, item lists and the monthly trend. `date` is a snapshot day; the latest upload when left out."""
from datetime import date as Date

from fastapi import APIRouter, Query

from app.core.deps import DB
from app.models import Dataset
from app.schemas.reports import ItemsOut, Overview, Summary, Trend
from app.services import reports

router = APIRouter(tags=["reports"])

OnDate = Query(None, alias="date", description="Snapshot day (YYYY-MM-DD); latest upload when left out")


@router.get("/overview", response_model=Overview)
def overview(db: DB, on_date: Date | None = OnDate):
    return reports.overview(db, on_date)


@router.get("/summary", response_model=Summary)
def summary(dataset: Dataset, db: DB, on_date: Date | None = OnDate):
    return reports.summary(db, dataset, on_date)


@router.get("/items", response_model=ItemsOut)
def items(dataset: Dataset, db: DB, on_date: Date | None = OnDate):
    return reports.items(db, dataset, on_date)


@router.get("/months", response_model=list[str])
def months(db: DB):
    return reports.months(db)


@router.get("/trend", response_model=Trend)
def trend(dataset: Dataset, db: DB, month: str | None = Query(None, pattern=r"^\d{4}-\d{2}$")):
    return reports.trend(db, dataset, month)
