# app/core/config.py

import os
from typing import Optional, List # Added List
from pydantic_settings import BaseSettings
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

class Settings(BaseSettings):
    # API settings
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "PDF Task Bot"

    # MinIO settings
    MINIO_ENDPOINT: str = os.getenv("MINIO_ENDPOINT", "localhost:9000")
    MINIO_ACCESS_KEY: str = os.getenv("MINIO_ACCESS_KEY", "minioadmin")
    MINIO_SECRET_KEY: str = os.getenv("MINIO_SECRET_KEY", "minioadmin123")
    MINIO_BUCKET_NAME: str = os.getenv("MINIO_BUCKET_NAME", "pdfs")
    MINIO_SECURE: bool = os.getenv("MINIO_SECURE", "False").lower() == "true"

    # File upload settings
    MAX_UPLOAD_SIZE: int = 10 * 1024 * 1024  # 10MB
    ALLOWED_EXTENSIONS: List[str] = ["pdf"] # Use List from typing

    # --- NEW: Gemini/AI settings ---
    GOOGLE_API_KEY: Optional[str] = os.getenv("GOOGLE_API_KEY")
    AI_MODEL_NAME: str = os.getenv("AI_MODEL_NAME", "gemini-2.0-flash") # Default to a known good model like 1.5 Flash
    AI_TEMPERATURE: float = os.getenv("AI_TEMPERATURE", 0.9) # Slightly creative but leaning factual
    AI_MAX_RETRIES: int = os.getenv("AI_MAX_RETRIES", 2)
    # --- End NEW ---

    # For future authentication
    # SECRET_KEY: str = os.getenv("SECRET_KEY", "")
    # ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 1 day

settings = Settings()

# --- NEW: Add a check for the API key ---
if not settings.GOOGLE_API_KEY:
    print("WARNING: GOOGLE_API_KEY is not set in the environment variables. AI processing will fail.")
    # You could raise a more severe error here if the key is absolutely essential at startup
    # raise ValueError("GOOGLE_API_KEY must be set in the environment variables.")
# --- End NEW ---