from __future__ import annotations

from datetime import datetime
from typing import Optional, Literal

from pydantic import BaseModel, ConfigDict, model_validator


class UserPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    first_name: str
    last_name: str
    email: str
    role: str
    is_active: bool


class WorkerApplicationCreate(BaseModel):
    phone: Optional[str] = None
    city: Optional[str] = None
    specialty: Optional[str] = None
    bio: Optional[str] = None
    years_experience: Optional[int] = None


class WorkerApplicationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int

    phone: Optional[str] = None
    city: Optional[str] = None
    specialty: Optional[str] = None
    bio: Optional[str] = None
    years_experience: Optional[int] = None

    status: str

    admin_notes: Optional[str] = None
    reviewed_by: Optional[int] = None
    reviewed_at: Optional[datetime] = None

    created_at: datetime
    updated_at: datetime


class WorkerApplicationAdminOut(WorkerApplicationOut):
    user: Optional[UserPublic] = None


# ✅ Alias para compatibilidad con imports viejos
AdminWorkerApplicationOut = WorkerApplicationAdminOut


class WorkerApplicationDecision(BaseModel):
    # compatibilidad vieja
    decision: Optional[Literal["APPROVE", "REJECT"]] = None
    # nuevo recomendado
    status: Optional[Literal["APPROVED", "REJECTED"]] = None
    admin_notes: Optional[str] = None

    @model_validator(mode="after")
    def _validate_one_of(self):
        if not self.decision and not self.status:
            raise ValueError(
                "Debes enviar 'status' (APPROVED/REJECTED) o 'decision' (APPROVE/REJECT)."
            )
        return self

    def normalized_status(self) -> str:
        if self.status:
            return self.status
        return "APPROVED" if self.decision == "APPROVE" else "REJECTED"
