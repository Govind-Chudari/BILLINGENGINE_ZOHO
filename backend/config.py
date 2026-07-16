import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    JWT_SECRET_KEY = os.environ.get(
        "JWT_SECRET_KEY",
        "dev-secret-key-change-in-production-must-be-32-chars"
    )
    JWT_ACCESS_TOKEN_EXPIRES = 900  # 15 min

    SQLALCHEMY_DATABASE_URI = os.environ.get(
        "DATABASE_URL",
        "sqlite:///billing.db"
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    MINIO_ENDPOINT   = os.environ.get("MINIO_ENDPOINT",   "localhost:9000")
    MINIO_ACCESS_KEY = os.environ.get("MINIO_ACCESS_KEY", "minioadmin")
    MINIO_SECRET_KEY = os.environ.get("MINIO_SECRET_KEY", "minioadmin123")
    MINIO_SECURE     = os.environ.get("MINIO_SECURE",     "false").lower() == "true"


    MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024

    STORAGE_QUOTA_BYTES = 50 * 1024 * 1024

    BLOCKED_EXTENSIONS = {
        ".exe", ".bat", ".sh", ".cmd", ".ps1",
        ".php", ".py", ".rb", ".js", ".jar",
        ".msi", ".dll", ".vbs", ".scr"
    }

    ALLOWED_EXTENSIONS = {
        ".jpg", ".jpeg", ".png", ".gif", ".webp",  # images
        ".pdf", ".doc", ".docx", ".xls", ".xlsx",  # documents
        ".txt", ".csv", ".json", ".xml",            # text/data
        ".mp4", ".mp3", ".zip", ".tar", ".gz"       # media/archives
    }

    PRICE_STORAGE_PER_GB_DAY = 0.25

    PRICE_API_PER_CALL = 0.001

    FREE_STORAGE_BYTES    = 1 * 1024 * 1024 * 1024   # 1-GB
    FREE_API_CALLS        = 1000