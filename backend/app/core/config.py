# backend/app/core/config.py
from pathlib import Path
from typing import Optional

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

# ✅ Asegura que el .env se lea SIEMPRE desde backend/.env
# backend/
#   .env
#   app/
#     core/
#       config.py
BASE_DIR = Path(__file__).resolve().parents[2]  # -> backend/
ENV_FILE = BASE_DIR / ".env"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(ENV_FILE),
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    database_url: str = Field(
        default="postgresql+psycopg2://siph:siph@localhost:5432/siph",
        validation_alias="DATABASE_URL",
    )

    jwt_secret_key: str = Field(default="change-me", validation_alias="JWT_SECRET_KEY")
    jwt_algorithm: str = Field(default="HS256", validation_alias="JWT_ALGORITHM")
    jwt_expiration_minutes: int = Field(
        default=60, validation_alias="JWT_EXPIRATION_MINUTES"
    )

    # ✅ No hardcode: viene del .env / docker env
    google_client_id: Optional[str] = Field(
        default=None, validation_alias="GOOGLE_CLIENT_ID"
    )


settings = Settings()
