"""Domain errors. Services raise these; app/main.py turns them into HTTP responses."""


class NotFound(LookupError):
    """→ 404"""


class Conflict(RuntimeError):
    """→ 409: the request is valid but the founder isn't at that step (e.g. no ID built yet)."""
