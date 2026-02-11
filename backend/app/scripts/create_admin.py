# backend/app/scripts/create_admin.py
import os

from sqlalchemy.orm import Session

from app.core.database import SessionLocal
from app.core.security import hash_password
from app.models.user import User


def main():
    email = (os.getenv("ADMIN_EMAIL") or "").strip().lower()
    password = os.getenv("ADMIN_PASSWORD") or ""
    first_name = (os.getenv("ADMIN_FIRST_NAME") or "Admin").strip()
    last_name = (os.getenv("ADMIN_LAST_NAME") or "SIPH").strip()

    if not email:
        raise SystemExit("❌ Falta ADMIN_EMAIL en el .env")
    if not password or len(password) < 6:
        raise SystemExit("❌ Falta ADMIN_PASSWORD (mínimo 6) en el .env")

    db: Session = SessionLocal()
    try:
        user = db.query(User).filter(User.email == email).first()

        if user:
            # Promueve/actualiza
            user.first_name = first_name
            user.last_name = last_name
            user.role = "ADMIN"
            user.is_active = True
            user.password_hash = hash_password(password)
            action = "actualizado/promovido"
        else:
            # Crea
            user = User(
                first_name=first_name,
                last_name=last_name,
                email=email,
                password_hash=hash_password(password),
                role="ADMIN",
                is_active=True,
            )
            db.add(user)
            action = "creado"

        db.commit()
        print(f"✅ Admin {action}: {email} (role=ADMIN)")
    except Exception as e:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
