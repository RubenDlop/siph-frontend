from __future__ import annotations

from datetime import datetime
from enum import Enum

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from ..core.database import Base


class WorkerApplicationStatus(str, Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"


class WorkerApplication(Base):
    __tablename__ = "worker_applications"

    id = Column(Integer, primary_key=True, index=True)

    # ✅ IMPORTANTE: SIN unique=True para permitir múltiples solicitudes por usuario (histórico)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)

    reviewed_by = Column(Integer, ForeignKey("users.id"), nullable=True)

    phone = Column(String(50), nullable=True)
    city = Column(String(120), nullable=True)
    specialty = Column(String(120), nullable=True)
    bio = Column(Text, nullable=True)
    years_experience = Column(Integer, nullable=True)

    status = Column(String(20), nullable=False, default=WorkerApplicationStatus.PENDING.value)
    admin_notes = Column(Text, nullable=True)

    reviewed_at = Column(DateTime, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    user = relationship("User", foreign_keys=[user_id], backref="worker_applications")
    reviewer = relationship("User", foreign_keys=[reviewed_by])

    def touch(self):
        self.updated_at = datetime.utcnow()
