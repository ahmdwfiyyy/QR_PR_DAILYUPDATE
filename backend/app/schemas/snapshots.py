from datetime import date, datetime

from pydantic import BaseModel

from app.models import SnapshotKind


class UploadResult(BaseModel):
    kind: SnapshotKind
    date: date
    filename: str | None
    replaced: bool  # an upload for this kind and day already existed and was replaced
    counts: dict[str, int]  # items per dataset, e.g. {"BU": 17, "BV": 109}
    sheets: list[str]  # raw sheets that were read


class UploadResponse(BaseModel):
    results: list[UploadResult]


class SnapshotInfo(BaseModel):
    filename: str | None
    uploaded_at: datetime
    counts: dict[str, int]


class SnapshotDay(BaseModel):
    """What was uploaded for one day. PR or QR is null when that file is missing."""

    date: date
    PR: SnapshotInfo | None = None
    QR: SnapshotInfo | None = None
