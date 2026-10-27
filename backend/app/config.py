from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    ENVIRONMENT: str = "development"
    BACKEND_HOST: str = "127.0.0.1"
    BACKEND_PORT: int = 8000
    CORS_ORIGINS: str = "http://localhost:5173,http://127.0.0.1:5173"
    
    # Security & Auth
    ADMIN_API_KEY: str = "virtualfit_admin_secret_key_change_me"
    
    # TryOn Provider
    DEMO_MODE: bool = True
    TRYON_PROVIDER: str = "mock"  # 'mock', 'hf_space', 'realtime_stub'
    HF_SPACE_ID: str = "zhengchong/CatVTON"
    HF_API_TOKEN: str = ""
    TRYON_TIMEOUT_SECONDS: int = 60
    
    # File Validation Limits
    MAX_UPLOAD_SIZE_BYTES: int = 5 * 1024 * 1024  # 5 MB
    MAX_IMAGE_DIMENSION: int = 4096
    MIN_IMAGE_DIMENSION: int = 64
    ALLOWED_IMAGE_TYPES: list[str] = ["image/jpeg", "image/png", "image/webp"]
    
    # Storage Paths (resolved relative to backend directory or workspace root)
    DATABASE_PATH: str = "data/virtualfit.db"
    UPLOAD_DIR: str = "data/uploads"
    TEMP_DIR: str = "data/temp"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    def get_cors_origins(self) -> list[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

    def resolve_path(self, rel_path: str) -> Path:
        base_dir = Path(__file__).resolve().parent.parent
        path = base_dir / rel_path
        path.parent.mkdir(parents=True, exist_ok=True)
        return path


settings = Settings()
