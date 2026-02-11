# backend/app/routers/admin_worker_applications.py
from datetime import datetime
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload

from ..core.database import get_db
from ..core.deps import require_roles
from ..models import User, WorkerApplication
from ..schemas.worker_application import AdminWorkerApplicationOut, WorkerApplicationDecision

router = APIRouter(prefix="/admin/worker-applications", tags=["admin-worker-applications"])


@router.get("", response_model=List[AdminWorkerApplicationOut])
def list_apps(
    status_filter: Optional[str] = Query(default=None, description="PENDING|APPROVED|REJECTED"),
    db: Session = Depends(get_db),
    _: User = Depends(require_roles("ADMIN")),
):
    q = db.query(WorkerApplication).options(joinedload(WorkerApplication.user))

    if status_filter:
        st = status_filter.upper().strip()
        if st not in ("PENDING", "APPROVED", "REJECTED"):
            raise HTTPException(status_code=400, detail="status_filter inválido")
        q = q.filter(WorkerApplication.status == st)

    return q.order_by(WorkerApplication.created_at.desc()).all()


@router.patch("/{app_id}", response_model=AdminWorkerApplicationOut)
def decide_app(
    app_id: int,
    payload: WorkerApplicationDecision,
    db: Session = Depends(get_db),
    admin: User = Depends(require_roles("ADMIN")),
):
    app = (
        db.query(WorkerApplication)
        .options(joinedload(WorkerApplication.user))
        .filter(WorkerApplication.id == app_id)
        .first()
    )
    if not app:
        raise HTTPException(status_code=404, detail="Solicitud no encontrada.")

    dec = payload.decision.upper().strip()

    if dec == "APPROVE":
        app.status = "APPROVED"
        app.admin_notes = payload.admin_notes
        app.reviewed_by = admin.id
        app.reviewed_at = datetime.utcnow()
        app.touch()

        # ✅ PROMOVER A WORKER
        if app.user and app.user.role != "ADMIN":
            app.user.role = "WORKER"

    elif dec == "REJECT":
        app.status = "REJECTED"
        app.admin_notes = payload.admin_notes
        app.reviewed_by = admin.id
        app.reviewed_at = datetime.utcnow()
        app.touch()
    else:
        raise HTTPException(status_code=400, detail="decision inválida (APPROVE|REJECT).")

    db.commit()
    db.refresh(app)
    return app
