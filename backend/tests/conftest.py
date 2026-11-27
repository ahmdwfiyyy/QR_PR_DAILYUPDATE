"""Tests run against a separate Postgres database (qr_pr_test), never the real data."""
import os
from pathlib import Path

os.environ["DATABASE_URL"] = os.environ.get(
    "TEST_DATABASE_URL", "postgresql+psycopg://qr_pr:qr_pr@localhost:5433/qr_pr_test"
)
# Fake buyer/category names, so tests never depend on the real aliases.json
os.environ["ALIASES_DIR"] = str(Path(__file__).parent / "fixtures")

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from sqlalchemy import text  # noqa: E402

import app.models  # noqa: E402,F401
from app.db import Base, SessionLocal, engine  # noqa: E402
from app.main import app  # noqa: E402
from tests.factories import pr_workbook, qr_workbook  # noqa: E402


@pytest.fixture(scope="session", autouse=True)
def schema():
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    yield
    Base.metadata.drop_all(engine)


@pytest.fixture(autouse=True)
def clean_tables():
    with engine.begin() as conn:
        if engine.dialect.name == "postgresql":
            tables = ", ".join(t.name for t in Base.metadata.sorted_tables)
            conn.execute(text(f"TRUNCATE {tables} RESTART IDENTITY CASCADE"))
        else:  # quick local runs without Docker: TEST_DATABASE_URL=sqlite:///test.db
            for table in reversed(Base.metadata.sorted_tables):
                conn.execute(table.delete())
    yield


@pytest.fixture
def db():
    session = SessionLocal()
    yield session
    session.close()


@pytest.fixture
def client():
    return TestClient(app)


def upload(client: TestClient, pr: bytes | None = None, qr: bytes | None = None, day: str = "261026", **data):
    """POST both files the way the Upload page does; the date comes from the filename unless overridden."""
    files = {}
    if pr is not None:
        files["pr_file"] = (f"ERP PR List by Buyer ({day}).xlsx", pr)
    if qr is not None:
        files["qr_file"] = (f"ERP QR List by Buyer ({day}).xlsx", qr)
    return client.post("/api/uploads", files=files, data=data)


@pytest.fixture
def uploaded(client):
    """One day (26 Oct 2026) with both files uploaded."""
    res = upload(client, pr_workbook(), qr_workbook())
    assert res.status_code == 200, res.text
    return res.json()
