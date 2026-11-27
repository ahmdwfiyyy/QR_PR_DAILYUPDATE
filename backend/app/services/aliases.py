"""Buyer and category name mapping.

The ERP spells the same buyer or category in different ways between exports. aliases.json maps each
spelling to one canonical name. It holds real staff names, so it is git-ignored; aliases.example.json
is the committed template and is used when aliases.json does not exist.
"""
import json
from functools import lru_cache
from pathlib import Path

from app.core.config import get_settings


@lru_cache
def load_aliases() -> dict[str, dict[str, str]]:
    folder = Path(get_settings().aliases_dir)
    path = folder / "aliases.json"
    if not path.exists():
        path = folder / "aliases.example.json"
    data = json.loads(path.read_text(encoding="utf-8")) if path.exists() else {}
    return {
        group: {k.strip().lower(): v.strip() for k, v in data.get(group, {}).items()}
        for group in ("buyers", "categories")
    }


def normalize_buyer(name: str | None) -> str | None:
    if not name:
        return None
    return load_aliases()["buyers"].get(name.lower(), name)


def normalize_category(name: str | None) -> str | None:
    if not name:
        return None
    return load_aliases()["categories"].get(name.lower(), name)
