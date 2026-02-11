from fastapi import Depends, HTTPException, status
from ..models import User
from .deps import get_current_user


def require_role(*roles: str):
    allowed = {r.upper() for r in roles}

    def _check(user: User = Depends(get_current_user)) -> User:
        user_role = (user.role or "USER").upper()
        if user_role not in allowed:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No autorizado.",
            )
        return user

    return _check
