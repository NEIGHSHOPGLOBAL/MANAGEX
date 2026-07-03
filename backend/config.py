import os
from datetime import timedelta

basedir = os.path.abspath(os.path.dirname(__file__))
data_dir = os.environ.get("MANAGEX_DATA_DIR", basedir)

_is_desktop = os.environ.get("MANAGEX_DESKTOP") == "1"


class Config:
    SECRET_KEY = os.environ.get("SECRET_KEY", "managex-dev-secret-key-change-in-production")
    JWT_SECRET_KEY = os.environ.get("JWT_SECRET_KEY", "managex-jwt-secret-change-in-production")
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(days=30) if _is_desktop else timedelta(hours=12)

    SQLALCHEMY_DATABASE_URI = os.environ.get(
        "DATABASE_URL",
        "sqlite:///" + os.path.join(data_dir, "managex.db"),
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    UPLOAD_FOLDER = os.path.join(data_dir, "uploads")
    FRONTEND_DIST = os.environ.get("MANAGEX_FRONTEND_DIST")
    MAX_CONTENT_LENGTH = 5 * 1024 * 1024  # 5 MB
    ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "gif", "webp", "pdf"}

    # Office geofence — lat/lng in degrees, radius in meters
    APP_TIMEZONE = os.environ.get("APP_TIMEZONE", "Asia/Kolkata")
    OFFICE_LAT = float(os.environ.get("OFFICE_LAT", "28.854196787284675"))
    OFFICE_LNG = float(os.environ.get("OFFICE_LNG", "77.09527546025957"))
    OFFICE_RADIUS_M = float(os.environ.get("OFFICE_RADIUS_M", "50"))
