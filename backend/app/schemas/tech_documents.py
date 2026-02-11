from __future__ import annotations
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict

class TechDocumentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    doc_type: str

    # guardamos el path relativo tipo: /uploads/xxxx.pdf
    url: str

    mime_type: Optional[str] = None
    original_name: Optional[str] = None
    created_at: datetime
