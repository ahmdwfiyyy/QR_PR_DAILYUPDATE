"""App settings, read from environment variables (see .env.example)."""
from datetime import date, datetime
from functools import lru_cache
from pathlib import Path
from zoneinfo import ZoneInfo

from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "Carsem Daily QR & PR"
    database_url: str = "postgresql+psycopg://qr_pr:qr_pr@localhost:5433/qr_pr"
    test_database_url: str = "postgresql+psycopg://qr_pr:qr_pr@localhost:5433/qr_pr_test"
    # Items older than this many days are flagged on the dashboard and lists
    aged_days: int = 3
    max_upload_mb: int = 10
    # Folder holding aliases.json (real names, git-ignored) or aliases.example.json
    aliases_dir: str = str(BACKEND_DIR / "config")
    # Business timezone: decides what "today" is
    app_timezone: str = "Asia/Kuala_Lumpur"


@lru_cache
def get_settings() -> Settings:
    return Settings()


def today() -> date:
    """Today's date in Carsem's timezone (not the server's)."""
    return datetime.now(ZoneInfo(get_settings().app_timezone)).date()
