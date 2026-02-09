from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel

from ..core.database import get_db
from ..core.security import hash_password, verify_password, create_access_token
from ..models import User
from ..schemas.auth import RegisterRequest, LoginRequest, AuthResponse

# ✅ Google token verification
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests

# ✅ Ajusta este import según tu proyecto:
# En tu árbol existe: app/core/config.py
# Asegúrate de tener allí GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")
from ..core.config import GOOGLE_CLIENT_ID


router = APIRouter(prefix="/auth", tags=["auth"])


class GoogleLoginRequest(BaseModel):
    credential: str  # ID token (credential) entregado por Google GIS


@router.post("/register", response_model=AuthResponse)
def register(payload: RegisterRequest, db: Session = Depends(get_db)) -> AuthResponse:
    existing = db.query(User).filter(User.email == payload.email.lower()).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="El correo ya está registrado."
        )

    user = User(
        first_name=payload.first_name.strip(),
        last_name=payload.last_name.strip(),
        email=payload.email.lower(),
        password_hash=hash_password(payload.password),
        role="USER",
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token(user.email)
    return AuthResponse(access_token=token)


@router.post("/login", response_model=AuthResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)) -> AuthResponse:
    user = db.query(User).filter(User.email == payload.email.lower()).first()

    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales inválidas."
        )

    token = create_access_token(user.email)
    return AuthResponse(access_token=token)


@router.post("/google", response_model=AuthResponse)
def login_with_google(payload: GoogleLoginRequest, db: Session = Depends(get_db)) -> AuthResponse:
    if not GOOGLE_CLIENT_ID:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="GOOGLE_CLIENT_ID no está configurado en el backend."
        )

    try:
        info = id_token.verify_oauth2_token(
            payload.credential,
            google_requests.Request(),
            GOOGLE_CLIENT_ID
        )
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token de Google inválido."
        )

    email = (info.get("email") or "").lower().strip()
    if not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Google no devolvió email."
        )

    first_name = (info.get("given_name") or "").strip()
    last_name = (info.get("family_name") or "").strip()
    google_sub = info.get("sub")  # id único del usuario en Google

    # Busca usuario por email
    user = db.query(User).filter(User.email == email).first()

    # Si no existe, lo creamos (sin password real)
    if not user:
        user = User(
            first_name=first_name or "Usuario",
            last_name=last_name or "Google",
            email=email,
            # Si tu columna NO permite NULL, guarda un hash "inutilizable"
            password_hash=hash_password(f"GOOGLE::{google_sub}"),
            role="USER",
        )

        # Si tu modelo User tiene campo google_sub, puedes guardarlo:
        # user.google_sub = google_sub

        db.add(user)
        db.commit()
        db.refresh(user)

    token = create_access_token(user.email)
    return AuthResponse(access_token=token)
