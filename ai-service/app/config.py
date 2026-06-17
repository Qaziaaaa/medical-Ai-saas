import os
from dotenv import load_dotenv
from pathlib import Path

# Load .env from backend folder (shares JWT_SECRET)
env_path = Path(__file__).resolve().parents[2] / "backend" / ".env"
if env_path.exists():
    load_dotenv(env_path)


class Settings:
    JWT_SECRET: str = os.getenv("JWT_SECRET", "dev-secret-change-in-production")
    JWT_ALGORITHM: str = "HS256"
    SERVICE_NAME: str = "ai-clinic-python"
    VERSION: str = "0.1.0"
    GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")


settings = Settings()
