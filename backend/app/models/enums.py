"""Type values. Stored in the database as plain strings."""
from enum import StrEnum


class SnapshotKind(StrEnum):
    """Which ERP export a daily upload came from."""

    PR = "PR"
    QR = "QR"


class Dataset(StrEnum):
    """Which list an item belongs to. The QR file holds two lists."""

    PR = "PR"  # open purchase requisitions
    BU = "BU"  # QR pending Buyer Update
    BV = "BV"  # QR pending Buyer Verify

    @property
    def kind(self) -> SnapshotKind:
        return SnapshotKind.PR if self is Dataset.PR else SnapshotKind.QR

    @property
    def label(self) -> str:
        return DATASET_LABELS[self]


DATASET_LABELS = {Dataset.PR: "PR Open", Dataset.BU: "QR Buyer Update", Dataset.BV: "QR Buyer Verify"}
