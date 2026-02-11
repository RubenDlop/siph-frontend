# backend/app/schemas/request.py
from pydantic import BaseModel, Field


class ServiceRequestCreate(BaseModel):
    title: str = Field(..., min_length=3)
    description: str = Field(..., min_length=10)


class ServiceRequestOut(BaseModel):
    id: int
    title: str
    status: str

    class Config:
        from_attributes = True
