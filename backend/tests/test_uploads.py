from tests.conftest import upload
from tests.factories import DEFAULT_PRS, pr_workbook, qr_workbook


def test_upload_both_files(client, uploaded):
    pr, qr = uploaded["results"]
    assert (pr["kind"], pr["date"], pr["counts"], pr["replaced"]) == ("PR", "2026-10-26", {"PR": 5}, False)
    assert (qr["kind"], qr["counts"]) == ("QR", {"BU": 2, "BV": 3})


def test_same_day_replaces(client, uploaded):
    res = upload(client, pr_workbook(DEFAULT_PRS[:2]))
    assert res.json()["results"][0]["replaced"] is True
    days = client.get("/api/snapshots").json()
    assert len(days) == 1
    assert days[0]["PR"]["counts"] == {"PR": 2}
    assert days[0]["QR"]["counts"] == {"BU": 2, "BV": 3}  # QR untouched


def test_date_override(client):
    res = upload(client, pr_workbook(), snapshot_date="2026-10-01")
    assert res.json()["results"][0]["date"] == "2026-10-01"


def test_missing_date_must_be_picked(client):
    files = {"pr_file": ("export.xlsx", pr_workbook(sheet_name="Data"))}
    res = client.post("/api/uploads", files=files)
    assert res.status_code == 400
    assert "pick the date" in res.json()["detail"]


def test_bad_file_saves_nothing(client):
    # The QR slot gets a PR file: the whole upload fails, so the valid PR file is not saved either
    res = upload(client, pr_workbook(), pr_workbook())
    assert res.status_code == 400
    assert client.get("/api/snapshots").json() == []


def test_only_excel_files(client):
    res = client.post("/api/uploads", files={"pr_file": ("notes (261026).txt", b"hello")})
    assert res.status_code == 400
    assert "only Excel files" in res.json()["detail"]


def test_nothing_chosen(client):
    assert client.post("/api/uploads").status_code == 400
