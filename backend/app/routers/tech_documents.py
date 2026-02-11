from __future__ import annotations
from datetime import datetime

from sqlalchemy import Column, DateTime, Integer, String, ForeignKey
from sqlalchemy.orm import relationship

from ..core.database import Base

class TechDocument(Base):
    __tablename__ = "tech_documents"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)

    doc_type = Column(String(50), nullable=False)

    # ejemplo: /uploads/uuid.pdf
    url = Column(String(255), nullable=False)

    mime_type = Column(String(120), nullable=True)
    original_name = Column(String(255), nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    user = relationship("User", foreign_keys=[user_id])
