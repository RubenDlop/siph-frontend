from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .core.database import Base, engine
from .routers import auth, requests


app = FastAPI(title="SIPH API")

Base.metadata.create_all(bind=engine)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:4200"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(requests.router)


@app.get("/health")
def health():
    return {"status": "ok"}
