# backend/app/routers/requests.py
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from ..core.database import get_db
from ..core.deps import get_current_user
from ..models import ServiceRequest
from ..schemas.request import ServiceRequestCreate, ServiceRequestOut


router = APIRouter(prefix="/requests", tags=["requests"])


@router.post("", response_model=ServiceRequestOut, status_code=status.HTTP_201_CREATED)
def create_request(
    payload: ServiceRequestCreate,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
) -> ServiceRequestOut:
    request = ServiceRequest(
        title=payload.title.strip(),
        description=payload.description.strip(),
        user_id=user.id,
    )
    db.add(request)
    db.commit()
    db.refresh(request)
    return request
