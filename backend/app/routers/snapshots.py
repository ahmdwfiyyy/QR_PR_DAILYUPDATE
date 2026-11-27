"""Upload history: which days have a PR and/or QR file, and deleting an upload."""
from datetime import date

from fastapi import APIRouter

from app.core.deps import DB
from app.models import SnapshotKind
from app.schemas.snapshots import SnapshotDay
from app.services.snapshots import delete_snapshot, list_snapshot_days

router = APIRouter(prefix="/snapshots", tags=["snapshots"])


@router.get("", response_model=list[SnapshotDay])
def list_snapshots(db: DB):
    return list_snapshot_days(db)


@router.delete("/{kind}/{snapshot_date}", status_code=204)
def remove_snapshot(kind: SnapshotKind, snapshot_date: date, db: DB):
    delete_snapshot(db, kind, snapshot_date)
