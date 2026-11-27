"""Carsem Daily QR & PR - FastAPI backend.

Run locally:  uvicorn app.main:app --reload --port 8001
API docs:     http://localhost:8001/docs
"""
from fastapi import APIRouter, FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import get_settings
from app.routers import reports, snapshots, uploads
from app.services.errors import ServiceError

app = FastAPI(title=get_settings().app_name)

# Only needed when the Vite dev server calls the API directly; in Docker nginx serves both on one origin
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(ServiceError)
def service_error(_: Request, exc: ServiceError):
    return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})


api = APIRouter(prefix="/api")
for module in (uploads, snapshots, reports):
    api.include_router(module.router)


@api.get("/health", tags=["health"])
def health():
    return {"status": "ok"}


app.include_router(api)
