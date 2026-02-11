# backend/app/routers/admin_technician_verification.py

from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session
from pathlib import Path

from ..core.database import get_db
from ..core.deps import get_current_user, require_roles
from ..models.user import User
from ..models.technician_verification import (
    VerificationCase,
    TechnicianProfile,
    VerificationAuditLog,
    VerificationDocument,
    TechStatus,
    TechLevel,
)

router = APIRouter(prefix="/admin/tech/verification", tags=["Admin Tech Verification"])


def _now():
    return datetime.utcnow()


def _log(db: Session, case_id: int, actor_id: int, action: str, detail: dict):
    db.add(
        VerificationAuditLog(
            case_id=case_id,
            actor_id=actor_id,
            action=action,
            detail=detail,
            created_at=_now(),
        )
    )


class ReviewDocPayload(BaseModel):
    result: str  # "ok" | "fail" | "unknown"
    notes: Optional[str] = None


@router.get("/cases")
def list_cases(
    status: str = "IN_REVIEW",
    limit: int = 50,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    require_roles("ADMIN", "VERIFIER")(user)

    q = db.query(VerificationCase)
    if status:
        try:
            q = q.filter(VerificationCase.status == TechStatus(status))
        except Exception:
            raise HTTPException(
                status_code=400,
                detail="status inválido (PENDING|IN_REVIEW|VERIFIED|REJECTED).",
            )

    cases = q.order_by(VerificationCase.created_at.desc()).limit(min(limit, 200)).all()

    out = []
    for c in cases:
        tech = (
            db.query(TechnicianProfile)
            .filter(TechnicianProfile.id == c.tech_id)
            .first()
        )
        out.append(
            {
                "caseId": c.id,
                "techId": c.tech_id,
                "publicName": tech.public_name if tech else "—",
                "targetLevel": c.target_level.value,
                "status": c.status.value,
                "createdAt": c.created_at.isoformat(),
            }
        )
    return out


# ✅ buscar el último caso por user_id (para integrarlo en modal de WorkerApplications)
@router.get("/cases/by-user/{user_id}")
def latest_case_by_user(
    user_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    require_roles("ADMIN", "VERIFIER")(user)

    tech = (
        db.query(TechnicianProfile)
        .filter(TechnicianProfile.user_id == user_id)
        .first()
    )
    if not tech:
        return {"hasCase": False}

    c = (
        db.query(VerificationCase)
        .filter(VerificationCase.tech_id == tech.id)
        .order_by(VerificationCase.created_at.desc())
        .first()
    )
    if not c:
        return {"hasCase": False}

    # Reusar detalle
    return case_detail(c.id, db, user)


@router.get("/cases/{case_id}")
def case_detail(
    case_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    require_roles("ADMIN", "VERIFIER")(user)

    c = db.query(VerificationCase).filter(VerificationCase.id == case_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Caso no encontrado.")

    tech = (
        db.query(TechnicianProfile)
        .filter(TechnicianProfile.id == c.tech_id)
        .first()
    )

    docs = (
        db.query(VerificationDocument)
        .filter(VerificationDocument.case_id == c.id)
        .order_by(VerificationDocument.received_at.asc())
        .all()
    )

    # ✅ helper: detectar ruta real del archivo (si tu modelo usa file_path o storage_ref)
    def _file_rel_path(d: VerificationDocument) -> Optional[str]:
        # 1) Si tu modelo tiene file_path
        fp = getattr(d, "file_path", None)
        if fp:
            return fp

        # 2) Si tu modelo guarda storage_ref tipo "file:///app/uploads/..."
        sr = getattr(d, "storage_ref", None)
        if isinstance(sr, str) and sr.startswith("file://"):
            # lo convertimos a un path absoluto; luego lo volvemos relativo a uploads_root si aplica
            abs_p = Path(sr.replace("file://", "", 1))
            return str(abs_p)  # lo tratamos como "abs" más abajo

        return None

    def _bool_has_file(d: VerificationDocument) -> bool:
        return bool(_file_rel_path(d))

    return {
        "hasCase": True,  # útil para tu frontend
        "caseId": c.id,
        "techId": c.tech_id,
        "status": c.status.value,
        "targetLevel": c.target_level.value,
        "createdAt": c.created_at.isoformat(),
        "updatedAt": c.updated_at.isoformat() if getattr(c, "updated_at", None) else None,
        "reason": getattr(c, "reason", None),
        "decisionNotes": getattr(c, "decision_notes", None),
        "verifiedAt": c.verified_at.isoformat() if getattr(c, "verified_at", None) else None,
        "expiresAt": c.expires_at.isoformat() if getattr(c, "expires_at", None) else None,
        "decidedBy": getattr(c, "decided_by", None),
        "tech": {
            "publicName": tech.public_name if tech else "—",
            "city": tech.city if tech else "—",
            "specialty": tech.specialty if tech else "—",
            "userId": tech.user_id if tech else None,
        },
        "documents": [
            {
                "id": d.id,
                "docType": d.doc_type.value,
                "receivedAt": d.received_at.isoformat() if d.received_at else None,
                "verifiedResult": d.verified_result,
                "verifiedAt": d.verified_at.isoformat() if d.verified_at else None,
                "meta": d.meta or {},
                # ✅ FIX: tu modelo es original_filename (no original_name)
                "originalName": getattr(d, "original_filename", None),
                "contentType": d.content_type,
                "hasFile": _bool_has_file(d),
                # opcional útil en UI
                "sizeBytes": getattr(d, "size_bytes", None),
                "sha256": getattr(d, "sha256", None),
            }
            for d in docs
        ],
    }


# ✅ descargar/ver archivo (para frontend con HttpClient responseType:'blob')
@router.get("/cases/{case_id}/documents/{doc_id}/file")
def download_document_file(
    case_id: int,
    doc_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    require_roles("ADMIN", "VERIFIER")(user)

    d = (
        db.query(VerificationDocument)
        .filter(
            VerificationDocument.id == doc_id,
            VerificationDocument.case_id == case_id,
        )
        .first()
    )
    if not d:
        raise HTTPException(
            status_code=404,
            detail="Documento no encontrado para ese caso.",
        )

    # 1) file_path (relativo dentro de uploads_root)
    file_path = getattr(d, "file_path", None)

    # 2) storage_ref tipo file://ABS_PATH
    storage_ref = getattr(d, "storage_ref", None)
    abs_from_storage: Optional[Path] = None
    if not file_path and isinstance(storage_ref, str) and storage_ref.startswith("file://"):
        abs_from_storage = Path(storage_ref.replace("file://", "", 1))

    if not file_path and not abs_from_storage:
        raise HTTPException(
            status_code=404,
            detail="Este documento no tiene archivo asociado.",
        )

    # uploads vive en backend/uploads/tech_verification/...
    base_dir = Path(__file__).resolve().parents[2]  # backend/
    uploads_root = base_dir / "uploads" / "tech_verification"
    uploads_root.mkdir(parents=True, exist_ok=True)

    # Resolver path real
    if abs_from_storage:
        abs_path = abs_from_storage
    else:
        abs_path = uploads_root / str(file_path)

    # ✅ seguridad: path debe quedar dentro de uploads_root (si es relativo)
    # si es absoluto por storage_ref, intentamos validarlo también:
    try:
        abs_path.resolve().relative_to(uploads_root.resolve())
    except Exception:
        # si el storage_ref apunta a otro lugar, lo bloqueamos para evitar LFI
        raise HTTPException(status_code=400, detail="Ruta de archivo inválida.")

    if not abs_path.exists():
        raise HTTPException(status_code=404, detail="Archivo no encontrado en disco.")

    filename = getattr(d, "original_filename", None) or f"{d.doc_type.value}_{d.id}"
    media_type = d.content_type or "application/octet-stream"

    return FileResponse(
        path=str(abs_path),
        media_type=media_type,
        filename=filename,
    )


@router.patch("/cases/{case_id}/documents/{doc_id}")
def review_document(
    case_id: int,
    doc_id: int,
    payload: ReviewDocPayload,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    require_roles("ADMIN", "VERIFIER")(user)

    d = (
        db.query(VerificationDocument)
        .filter(
            VerificationDocument.id == doc_id,
            VerificationDocument.case_id == case_id,
        )
        .first()
    )
    if not d:
        raise HTTPException(status_code=404, detail="Documento no encontrado para ese caso.")

    res = (payload.result or "").lower().strip()
    if res not in ("ok", "fail", "unknown"):
        raise HTTPException(status_code=400, detail="result inválido: ok|fail|unknown")

    d.verified_result = res
    d.verified_at = _now()

    meta = d.meta or {}
    if payload.notes:
        meta["admin_notes"] = payload.notes
    d.meta = meta

    _log(
        db,
        case_id,
        user.id,
        "REVIEW_DOC",
        {
            "docId": doc_id,
            "docType": d.doc_type.value,
            "result": res,
            "notes": payload.notes,
        },
    )

    db.commit()
    db.refresh(d)

    return {
        "ok": True,
        "docId": d.id,
        "result": d.verified_result,
        "verifiedAt": d.verified_at.isoformat() if d.verified_at else None,
    }


@router.patch("/cases/{case_id}/decide")
def decide_case(
    case_id: int,
    decision: str,  # "VERIFY"|"REJECT"
    reason: Optional[str] = None,
    decision_notes: Optional[str] = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    require_roles("ADMIN", "VERIFIER")(user)

    c = db.query(VerificationCase).filter(VerificationCase.id == case_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Caso no encontrado.")

    dec = (decision or "").upper().strip()

    if dec == "VERIFY":
        c.status = TechStatus.VERIFIED
        c.reason = None
        c.verified_at = _now()

        tech = db.query(TechnicianProfile).filter(TechnicianProfile.id == c.tech_id).first()
        if tech:
            tech.badge_level = c.target_level

        months = 12
        if c.target_level == TechLevel.TRUST:
            months = 6
        c.expires_at = _now() + timedelta(days=30 * months)

    elif dec == "REJECT":
        c.status = TechStatus.REJECTED
        c.reason = reason or "Falta información o el documento no coincide."
        c.verified_at = None
        c.expires_at = None
    else:
        raise HTTPException(status_code=400, detail="decision inválida (VERIFY/REJECT).")

    c.decided_by = user.id
    c.decision_notes = decision_notes
    c.updated_at = _now()

    _log(
        db,
        c.id,
        user.id,
        "DECIDE",
        {"decision": dec, "reason": c.reason, "notes": decision_notes},
    )
    db.commit()

    return {
        "ok": True,
        "caseId": c.id,
        "status": c.status.value,
        "reason": c.reason,
        "expiresAt": c.expires_at.isoformat() if c.expires_at else None,
    }


@router.get("/cases/{case_id}/logs")
def case_logs(
    case_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    require_roles("ADMIN", "VERIFIER")(user)

    logs = (
        db.query(VerificationAuditLog)
        .filter(VerificationAuditLog.case_id == case_id)
        .order_by(VerificationAuditLog.created_at.asc())
        .all()
    )
    return [
        {
            "at": l.created_at.isoformat(),
            "action": l.action,
            "detail": l.detail,
            "actorId": l.actor_id,
        }
        for l in logs
    ]
