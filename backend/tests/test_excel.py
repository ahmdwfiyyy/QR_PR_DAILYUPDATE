from datetime import date
from decimal import Decimal

import pytest

from app.models import Dataset
from app.services.errors import ServiceError
from app.services.excel import detect_date, parse_pr, parse_qr
from tests.factories import pr_workbook, qr_workbook


def test_date_from_filename_then_sheet_name():
    assert detect_date("ERP PR List by Buyer (261026).xlsx", []) == date(2026, 10, 26)
    assert detect_date("export.xlsx", ["PR_SUMMARY", "011126"]) == date(2026, 11, 1)
    assert detect_date("export.xlsx", ["Sheet1"]) is None
    assert detect_date("bad (999999).xlsx", []) is None


def test_pr_reads_raw_sheet_and_ignores_pivot():
    parsed = parse_pr(pr_workbook(), "x.xlsx")
    assert parsed.sheets == ["261026"]
    assert parsed.date == date(2026, 10, 26)  # from the sheet name
    assert [i["doc_no"] for i in parsed.items] == ["PR-001", "PR-002", "PR-003", "PR-004", "PR-005"]
    first = parsed.items[0]
    assert first["dataset"] == Dataset.PR
    assert first["doc_date"] == date(2026, 10, 20)
    assert first["total_price"] == Decimal("100.50")
    assert first["vendor"] == "ACME SUPPLIES SDN BHD"  # leading "- " removed
    assert first["approver"] == "APPROVER1,APPROVER2"  # trailing comma removed


def test_names_are_mapped_and_raw_kept():
    items = {i["doc_no"]: i for i in parse_pr(pr_workbook()).items}
    assert (items["PR-001"]["buyer"], items["PR-001"]["buyer_raw"]) == ("Alice", "Alice Fullname")
    assert items["PR-004"]["buyer"] == "Bob"
    assert (items["PR-003"]["category"], items["PR-003"]["category_raw"]) == ("Non-OEM", "Non OEM")


def test_qr_trims_headers_and_splits_update_and_verify():
    parsed = parse_qr(qr_workbook())
    assert parsed.sheets == ["Buyer Update", "Buyer Verify"]
    by_set = {}
    for item in parsed.items:
        by_set.setdefault(item["dataset"], []).append(item["doc_no"])
    assert by_set == {Dataset.BU: ["QR-101", "QR-102"], Dataset.BV: ["QR-201", "QR-202", "QR-203"]}
    verify = next(i for i in parsed.items if i["doc_no"] == "QR-203")
    assert verify["aging_days"] == 48
    assert verify["vendor"] == "VENDOR ONE; VENDOR TWO"


def test_wrong_file_type_is_rejected():
    with pytest.raises(ServiceError, match="No PR data sheet"):
        parse_pr(qr_workbook())
    with pytest.raises(ServiceError, match="No QR data sheets"):
        parse_qr(pr_workbook())
    with pytest.raises(ServiceError, match="Could not read"):
        parse_pr(b"not an excel file")
