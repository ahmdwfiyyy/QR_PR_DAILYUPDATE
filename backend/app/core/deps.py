"""FastAPI dependencies shared by the routers.

There is no login yet. When the app moves to the intranet, the signed-in user and role checks
go here (same as PO Tracker's app/core/deps.py) and every router picks them up.
"""
from typing import Annotated

from fastapi import Depends
from sqlalchemy.orm import Session

from app.db import get_db

DB = Annotated[Session, Depends(get_db)]
