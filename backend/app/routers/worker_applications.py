from __future__ import annotations

from datetime import datetime
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from ..core.database import get_db
from ..core.deps import get_current_user, require_roles
from ..models import WorkerApplication, WorkerApplicationStatus, User
from ..schemas.worker_application import (
    WorkerApplicationCreate,
    WorkerApplicationOut,
    WorkerApplicationAdminOut,
    WorkerApplicationDecision,
)

router = APIRouter(prefix="/worker-applications", tags=["worker-applications"])
admin_router = APIRouter(prefix="/admin/worker-applications", tags=["admin-worker-applications"])


@router.post("", response_model=WorkerApplicationOut, status_code=status.HTTP_201_CREATED)
def apply_as_worker(
    payload: WorkerApplicationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "USER":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Solo usuarios con rol USER pueden postularse.",
        )

    app = WorkerApplication(user_id=current_user.id)
    app.phone = payload.phone
    app.city = payload.city
    app.specialty = payload.specialty
    app.bio = payload.bio
    app.years_experience = payload.years_experience

    app.status = WorkerApplicationStatus.PENDING.value
    app.admin_notes = None
    app.reviewed_by = None
    app.reviewed_at = None
    app.touch()

    db.add(app)
    db.commit()
    db.refresh(app)
    return app


@router.get("/me", response_model=WorkerApplicationOut)
def my_application(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    app = (
        db.query(WorkerApplication)
        .filter(WorkerApplication.user_id == current_user.id)
        .order_by(WorkerApplication.created_at.desc())
        .first()
    )
    if not app:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No tienes solicitudes.")
    return app


@admin_router.get("", response_model=List[WorkerApplicationAdminOut])
def admin_list_applications(
    status_filter: Optional[str] = None,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles("ADMIN")),
):
    q = (
        db.query(WorkerApplication)
        .options(joinedload(WorkerApplication.user))
        .order_by(WorkerApplication.created_at.desc())
    )

    if status_filter:
        try:
            sf = WorkerApplicationStatus(status_filter)
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="status_filter inválido. Usa PENDING, APPROVED o REJECTED.",
            )
        q = q.filter(WorkerApplication.status == sf.value)

    return q.all()


@admin_router.patch("/{app_id}", response_model=WorkerApplicationAdminOut)
def admin_decide_application(
    app_id: int,
    decision: WorkerApplicationDecision,
    db: Session = Depends(get_db),
    current_admin: User = Depends(require_roles("ADMIN")),
):
    app = (
        db.query(WorkerApplication)
        .options(joinedload(WorkerApplication.user))
        .filter(WorkerApplication.id == app_id)
        .first()
    )
    if not app:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Solicitud no encontrada.")

    normalized = decision.normalized_status()

    try:
        new_status = WorkerApplicationStatus(normalized)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Estado inválido. Usa APPROVED/REJECTED (o decision APPROVE/REJECT).",
        )

    app.status = new_status.value
    app.admin_notes = decision.admin_notes
    app.reviewed_by = current_admin.id
    app.reviewed_at = datetime.utcnow()
    app.touch()

    if new_status == WorkerApplicationStatus.APPROVED:
        user = db.query(User).filter(User.id == app.user_id).first()
        if user and user.role != "ADMIN":
            user.role = "WORKER"

    db.commit()
    db.refresh(app)
    return app
