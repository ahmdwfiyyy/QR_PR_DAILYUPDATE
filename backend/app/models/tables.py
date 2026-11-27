"""Database tables.

One snapshot per (kind, day): uploading the same file type again for that day replaces it.
Each snapshot holds every open item on that day, so history and trends come from comparing snapshots.
"""
from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import Date, DateTime, ForeignKey, Index, Integer, Numeric, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base, utcnow


class Snapshot(Base):
    __tablename__ = "snapshots"
    __table_args__ = (UniqueConstraint("kind", "snapshot_date", name="uq_snapshots_kind_date"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    kind: Mapped[str] = mapped_column(String(10))  # SnapshotKind
    snapshot_date: Mapped[date] = mapped_column(Date, index=True)
    filename: Mapped[str | None] = mapped_column(String(255))
    uploaded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    items: Mapped[list["Item"]] = relationship(
        back_populates="snapshot", cascade="all, delete-orphan", passive_deletes=True
    )


class Item(Base):
    """One open PR or pending QR in one snapshot. Columns are shared by PR and QR; unused ones stay empty."""

    __tablename__ = "items"
    __table_args__ = (
        Index("ix_items_snapshot_dataset", "snapshot_id", "dataset"),
        Index("ix_items_dataset_doc", "dataset", "doc_no"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    snapshot_id: Mapped[int] = mapped_column(ForeignKey("snapshots.id", ondelete="CASCADE"))
    dataset: Mapped[str] = mapped_column(String(10))  # Dataset
    doc_no: Mapped[str] = mapped_column(String(50))  # PR_No / QR No.
    doc_date: Mapped[date | None] = mapped_column(Date)  # Created_Date / QR Date
    description: Mapped[str | None] = mapped_column(Text)  # Remarks / Description
    category: Mapped[str | None] = mapped_column(String(200))  # after name mapping
    category_raw: Mapped[str | None] = mapped_column(String(200))  # as in the file
    buyer: Mapped[str | None] = mapped_column(String(200))  # after name mapping
    buyer_raw: Mapped[str | None] = mapped_column(String(200))  # as in the file
    requestor: Mapped[str | None] = mapped_column(String(200))
    department: Mapped[str | None] = mapped_column(String(200))  # PR Department / QR Site
    approver: Mapped[str | None] = mapped_column(Text)  # PR ApproveUser / QR Current Approver
    status: Mapped[str | None] = mapped_column(String(100))
    aging_days: Mapped[int | None] = mapped_column(Integer)  # DaysAging / Elapsed(Days)
    vendor: Mapped[str | None] = mapped_column(Text)  # PR Vendor_Recommended / QR Pending (quoted vendors)
    total_price: Mapped[Decimal | None] = mapped_column(Numeric(14, 2))
    currency: Mapped[str | None] = mapped_column(String(10))
    cost_block: Mapped[str | None] = mapped_column(String(50))
    cer_no: Mapped[str | None] = mapped_column(String(100))
    mer_no: Mapped[str | None] = mapped_column(String(100))
    expenditure_type: Mapped[str | None] = mapped_column(String(50))
    last_operate: Mapped[str | None] = mapped_column(String(30))
    submission_date: Mapped[date | None] = mapped_column(Date)

    snapshot: Mapped[Snapshot] = relationship(back_populates="items")
