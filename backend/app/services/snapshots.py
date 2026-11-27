"""Daily uploads: store, replace, list and delete snapshots (used by the routers, seed.py and migrate_sqlite.py)."""
from collections import Counter, defaultdict
from dataclasses import dataclass
from datetime import date
from pathlib import Path

from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models import Dataset, Item, Snapshot, SnapshotKind
from app.schemas.snapshots import SnapshotDay, SnapshotInfo, UploadResult
from app.services.errors import ServiceError
from app.services.excel import PARSERS, ParsedFile

EXCEL_EXTENSIONS = {".xlsx", ".xlsm"}


@dataclass
class ExcelUpload:
    kind: SnapshotKind
    filename: str
    content: bytes


# --------------------------------------------------------------------------- lookups
def get_snapshot(db: Session, kind: SnapshotKind, on_date: date | None = None) -> Snapshot | None:
    """The snapshot of this kind on a day, or the latest one when no day is given."""
    query = select(Snapshot).where(Snapshot.kind == kind)
    if on_date:
        return db.scalar(query.where(Snapshot.snapshot_date == on_date))
    return db.scalar(query.order_by(Snapshot.snapshot_date.desc()).limit(1))


def require_snapshot(db: Session, dataset: Dataset, on_date: date | None) -> Snapshot:
    snapshot = get_snapshot(db, dataset.kind, on_date)
    if snapshot is None:
        raise ServiceError(f"No {dataset.kind} upload found" + (f" for {on_date}" if on_date else ""), 404)
    return snapshot


def previous_snapshot(db: Session, kind: SnapshotKind, before: date) -> Snapshot | None:
    return db.scalar(
        select(Snapshot)
        .where(Snapshot.kind == kind, Snapshot.snapshot_date < before)
        .order_by(Snapshot.snapshot_date.desc())
        .limit(1)
    )


def latest_date(db: Session) -> date | None:
    return db.scalar(select(func.max(Snapshot.snapshot_date)))


# --------------------------------------------------------------------------- upload
def _check_file(file: ExcelUpload) -> None:
    if Path(file.filename).suffix.lower() not in EXCEL_EXTENSIONS:
        raise ServiceError(f"{file.filename}: only Excel files (.xlsx, .xlsm) can be uploaded.")
    limit = get_settings().max_upload_mb
    if len(file.content) > limit * 1024 * 1024:
        raise ServiceError(f"{file.filename} is larger than {limit} MB.")


def store_snapshot(db: Session, parsed: ParsedFile, snapshot_date: date, filename: str | None) -> UploadResult:
    """Save one parsed file as the snapshot for its day, replacing an earlier upload. Does not commit."""
    if not parsed.items:
        raise ServiceError(f"The {parsed.kind} file contains no rows.")
    existing = get_snapshot(db, parsed.kind, snapshot_date)
    if existing:
        db.execute(delete(Item).where(Item.snapshot_id == existing.id))
        db.delete(existing)
        db.flush()
    snapshot = Snapshot(kind=parsed.kind, snapshot_date=snapshot_date, filename=filename)
    snapshot.items = [Item(**row) for row in parsed.items]
    db.add(snapshot)
    db.flush()
    return UploadResult(
        kind=parsed.kind,
        date=snapshot_date,
        filename=filename,
        replaced=existing is not None,
        counts=dict(Counter(str(row["dataset"]) for row in parsed.items)),
        sheets=parsed.sheets,
    )


def upload_files(db: Session, files: list[ExcelUpload], override_date: date | None = None) -> list[UploadResult]:
    """Parse every file first, then save them together, so one bad file leaves nothing half-saved."""
    if not files:
        raise ServiceError("Choose at least one file to upload.")
    jobs = []
    for file in files:
        _check_file(file)
        parsed = PARSERS[file.kind](file.content, file.filename)
        the_date = override_date or parsed.date
        if the_date is None:
            raise ServiceError(f"Could not detect the date for the {file.kind} file. Please pick the date manually.")
        jobs.append((parsed, the_date, file.filename))
    results = [store_snapshot(db, *job) for job in jobs]
    db.commit()
    return results


# --------------------------------------------------------------------------- history
def list_snapshot_days(db: Session) -> list[SnapshotDay]:
    counts: dict[int, dict[str, int]] = defaultdict(dict)
    for snapshot_id, dataset, n in db.execute(
        select(Item.snapshot_id, Item.dataset, func.count(Item.id)).group_by(Item.snapshot_id, Item.dataset)
    ):
        counts[snapshot_id][dataset] = n

    days: dict[date, SnapshotDay] = {}
    for snap in db.scalars(select(Snapshot).order_by(Snapshot.snapshot_date.desc())):
        day = days.setdefault(snap.snapshot_date, SnapshotDay(date=snap.snapshot_date))
        info = SnapshotInfo(filename=snap.filename, uploaded_at=snap.uploaded_at, counts=counts[snap.id])
        setattr(day, snap.kind, info)
    return list(days.values())


def delete_snapshot(db: Session, kind: SnapshotKind, on_date: date) -> None:
    snapshot = get_snapshot(db, kind, on_date)
    if snapshot is None:
        raise ServiceError("Upload not found", 404)
    db.execute(delete(Item).where(Item.snapshot_id == snapshot.id))
    db.delete(snapshot)
    db.commit()
