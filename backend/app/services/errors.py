class ServiceError(Exception):
    """A business-rule failure. Turned into an HTTP error response by app.main.

    Services raise this instead of HTTPException so they can be reused outside a request
    (e.g. migrate_sqlite.py and seed.py)."""

    def __init__(self, detail: str, status_code: int = 400):
        super().__init__(detail)
        self.detail = detail
        self.status_code = status_code
