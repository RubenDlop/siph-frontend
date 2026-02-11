# backend/app/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .core.database import Base, engine

# ✅ Importar modelos para que SQLAlchemy registre las tablas (side effects)
# (con que se importen 1 vez es suficiente)
from .models.user import User  # noqa: F401
from .models.service_request import ServiceRequest  # noqa: F401
from .models.worker_application import WorkerApplication  # noqa: F401
from .models.technician_verification import (  # noqa: F401
    TechnicianProfile,
    VerificationCase,
    VerificationDocument,
    VerificationAuditLog,
)

from .routers import (
    auth,
    requests,
    worker_applications,
    technician_verification as tech_ver_router,
    admin_technician_verification,
    admin_worker_applications,
)

app = FastAPI(title="SIPH API")

# =========================
# CORS (Angular)
# =========================
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:4200",
        "http://127.0.0.1:4200",
        # ✅ Si accedes desde otra PC/móvil con IP, agrega aquí:
        # "http://192.168.1.100:4200",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    # ✅ Recomendado si descargas archivos y quieres leer el filename en frontend
    expose_headers=["Content-Disposition"],
)

# ✅ Crear tablas (modo prototipo/dev)
Base.metadata.create_all(bind=engine)

# =========================
# Routers
# =========================
app.include_router(auth.router)
app.include_router(requests.router)

# worker applications: user + admin
app.include_router(worker_applications.router)
app.include_router(worker_applications.admin_router)
app.include_router(admin_worker_applications.router)

# technician verification: user + admin
app.include_router(tech_ver_router.router)
app.include_router(admin_technician_verification.router)

# =========================
# Healthcheck
# =========================
@app.get("/health")
def health():
    return {"status": "ok"}
