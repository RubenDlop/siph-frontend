# backend/app/routers/__init__.py
from . import (
    auth,
    requests,
    worker_applications,
    technician_verification,
    admin_technician_verification,
    admin_worker_applications,
)

__all__ = [
    "auth",
    "requests",
    "worker_applications",
    "admin_worker_applications",
    "technician_verification",
    "admin_technician_verification",
]
