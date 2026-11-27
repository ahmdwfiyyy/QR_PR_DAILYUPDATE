"""Uploading the daily ERP exports."""
from datetime import date

from fastapi import APIRouter, File, Form, UploadFile

from app.core.deps import DB
from app.models import SnapshotKind
from app.schemas.snapshots import UploadResponse
from app.services.snapshots import ExcelUpload, upload_files

router = APIRouter(prefix="/uploads", tags=["uploads"])


@router.post("", response_model=UploadResponse)
async def upload(
    db: DB,
    pr_file: UploadFile | None = File(None, description="ERP PR List by Buyer (DDMMYY).xlsx"),
    qr_file: UploadFile | None = File(None, description="ERP QR List by Buyer (DDMMYY).xlsx"),
    snapshot_date: date | None = Form(None, description="Overrides the date found in the filename"),
):
    files = [
        ExcelUpload(kind, f.filename or "", await f.read())
        for kind, f in ((SnapshotKind.PR, pr_file), (SnapshotKind.QR, qr_file))
        if f is not None and f.filename
    ]
    return UploadResponse(results=upload_files(db, files, snapshot_date))
