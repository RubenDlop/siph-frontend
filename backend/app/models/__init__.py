# backend/app/models/__init__.py
from .user import User
from .service_request import ServiceRequest
from .worker_application import WorkerApplication, WorkerApplicationStatus

from .technician_verification import (
    Role,
    TechLevel,
    TechStatus,
    DocType,
    TechnicianProfile,
    VerificationCase,
    VerificationDocument,
    VerificationAuditLog,
)

__all__ = [
    "User",
    "ServiceRequest",
    "WorkerApplication",
    "WorkerApplicationStatus",
    "Role",
    "TechLevel",
    "TechStatus",
    "DocType",
    "TechnicianProfile",
    "VerificationCase",
    "VerificationDocument",
    "VerificationAuditLog",
]
