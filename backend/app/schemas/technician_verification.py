# backend/app/schemas/technician_verification.py
from pydantic import BaseModel, Field
from typing import Any, Dict, List, Literal, Optional

TechLevel = Literal["BASIC", "TRUST", "PRO", "PAY"]
TechStatus = Literal["PENDING", "IN_REVIEW", "VERIFIED", "REJECTED"]
DocType = Literal[
    "ID_PHOTO","POLICE_CERT","PROCURADURIA_CERT","RNMC_CERT","REFERENCES",
    "PRO_LICENSE","STUDY_CERT","HEIGHTS_CERT","GAS_CERT","RUT","BANK_CERT"
]

class UpsertProfilePayload(BaseModel):
    public: Dict[str, Any] = Field(default_factory=dict)
    private: Dict[str, Any] = Field(default_factory=dict)
    technician: Dict[str, Any] = Field(default_factory=dict)
    consents: Dict[str, Any] = Field(default_factory=dict)

class SubmitPayload(BaseModel):
    targetLevel: TechLevel
    extra: Optional[Dict[str, Any]] = None

class VerificationMeResponse(BaseModel):
    techId: int
    currentLevel: TechLevel
    status: TechStatus
    verifiedAt: Optional[str] = None
    expiresAt: Optional[str] = None
    reason: Optional[str] = None

class UploadDocResponse(BaseModel):
    ok: bool = True
    docType: DocType
    receivedAt: str

class OkResponse(BaseModel):
    ok: bool = True
