from datetime import date

from pydantic import BaseModel

from app.models import Dataset
from app.schemas.common import ORM, MoneyOut


# --------------------------------------------------------------------------- dashboard
class DatasetHeadline(BaseModel):
    label: str
    total: int
    aged: int  # older than aged_days
    oldest: int
    prev_date: date | None  # previous upload of the same file type
    prev_total: int | None
    new: int | None  # not in the previous upload
    cleared: int | None  # in the previous upload, gone now


class BuyerCounts(BaseModel):
    """Open items per buyer. null = that file was not uploaded for the day."""

    buyer: str
    PR: int | None = None
    BU: int | None = None
    BV: int | None = None


class Overview(BaseModel):
    date: date | None
    aged_days: int
    datasets: dict[str, DatasetHeadline | None]
    buyers: list[BuyerCounts]


# --------------------------------------------------------------------------- pivots (the *_SUMMARY sheets)
class BuyerAging(BaseModel):
    buyer: str
    counts: dict[str, int]  # aging days -> number of items
    total: int


class CategoryCount(BaseModel):
    category: str
    count: int


class BuyerCategories(BaseModel):
    buyer: str
    total: int
    categories: list[CategoryCount]


class Summary(BaseModel):
    dataset: Dataset
    label: str
    date: date
    aged_days: int
    aging_columns: list[int]
    buyers: list[BuyerAging]
    column_totals: dict[str, int]
    total: int
    categories: list[BuyerCategories]


# --------------------------------------------------------------------------- item lists
class ItemOut(ORM):
    doc_no: str
    doc_date: date | None
    description: str | None
    category: str | None
    category_raw: str | None
    buyer: str | None
    buyer_raw: str | None
    requestor: str | None
    department: str | None
    approver: str | None
    status: str | None
    aging_days: int | None
    vendor: str | None
    total_price: MoneyOut | None
    currency: str | None
    cost_block: str | None
    cer_no: str | None
    mer_no: str | None
    expenditure_type: str | None
    last_operate: str | None
    submission_date: date | None
    is_new: bool = False  # not in the previous upload


class ItemsOut(BaseModel):
    dataset: Dataset
    date: date
    prev_date: date | None
    aged_days: int
    items: list[ItemOut]
    cleared: list[ItemOut]  # in the previous upload, gone now


# --------------------------------------------------------------------------- monthly trend
class TrendSeries(BaseModel):
    buyer: str
    values: dict[str, int | None]  # every day of the month; null = no upload that day
    avg: float | None  # over days that have an upload


class TrendTotal(BaseModel):
    values: dict[str, int | None]
    avg: float | None


class Trend(BaseModel):
    dataset: Dataset
    label: str
    month: str  # YYYY-MM
    days: list[date]
    snapshot_days: list[date]
    buyers: list[TrendSeries]
    total: TrendTotal
