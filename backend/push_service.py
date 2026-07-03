import json
import logging
import os

logger = logging.getLogger(__name__)

_firebase_ready = None

INVALID_TOKEN_CODES = {
    "registration-token-not-registered",
    "invalid-registration-token",
    "invalid-argument",
}


def firebase_enabled():
    global _firebase_ready
    if _firebase_ready is not None:
        return _firebase_ready
    if not os.environ.get("FIREBASE_CREDENTIALS_PATH") and not os.environ.get("FIREBASE_CREDENTIALS_JSON"):
        _firebase_ready = False
        return False
    try:
        import firebase_admin
        from firebase_admin import credentials

        if not firebase_admin._apps:
            cred_json = os.environ.get("FIREBASE_CREDENTIALS_JSON")
            if cred_json:
                cred = credentials.Certificate(json.loads(cred_json))
            else:
                cred = credentials.Certificate(os.environ["FIREBASE_CREDENTIALS_PATH"])
            firebase_admin.initialize_app(cred)
        _firebase_ready = True
    except Exception as exc:
        logger.warning("Firebase not configured: %s", exc)
        _firebase_ready = False
    return _firebase_ready


def user_wants_push(user_id):
    from models import UserPreferences

    prefs_row = UserPreferences.query.filter_by(user_id=user_id).first()
    if not prefs_row:
        return True
    return bool(prefs_row.get_prefs().get("desktop_notifications", False))


def _entity_path(entity_type, entity_id):
    if entity_type == "task" and entity_id:
        return f"/tasks/{entity_id}"
    if entity_type == "meeting" and entity_id:
        return "/meetings"
    return "/"


def _prune_invalid_tokens(token_rows, response):
    from extensions import db

    removed = False
    for idx, send_response in enumerate(response.responses):
        if send_response.success:
            continue
        err = send_response.exception
        code = getattr(err, "code", "") or ""
        if any(part in code for part in INVALID_TOKEN_CODES):
            db.session.delete(token_rows[idx])
            removed = True
            logger.info("Removed invalid FCM token for user %s", token_rows[idx].user_id)
    if removed:
        db.session.commit()


def send_push_to_user(user_id, title, body, data=None):
    if not firebase_enabled() or not user_wants_push(user_id):
        return
    from models import DeviceToken

    token_rows = DeviceToken.query.filter_by(user_id=user_id).all()
    if not token_rows:
        return
    try:
        from firebase_admin import messaging

        payload_data = {k: str(v) for k, v in (data or {}).items()}
        entity_type = (data or {}).get("entity_type")
        entity_id = (data or {}).get("entity_id")
        payload_data["path"] = _entity_path(entity_type, entity_id)

        message = messaging.MulticastMessage(
            notification=messaging.Notification(title=title, body=body),
            data=payload_data,
            tokens=[row.token for row in token_rows],
        )
        response = messaging.send_each_for_multicast(message)
        if response.failure_count:
            logger.info("FCM failures: %s", response.failure_count)
            _prune_invalid_tokens(token_rows, response)
    except Exception as exc:
        logger.warning("FCM send failed: %s", exc)


def get_firebase_web_config():
    return {
        "apiKey": os.environ.get("FIREBASE_API_KEY", ""),
        "authDomain": os.environ.get("FIREBASE_AUTH_DOMAIN", ""),
        "projectId": os.environ.get("FIREBASE_PROJECT_ID", ""),
        "storageBucket": os.environ.get("FIREBASE_STORAGE_BUCKET", ""),
        "messagingSenderId": os.environ.get("FIREBASE_MESSAGING_SENDER_ID", ""),
        "appId": os.environ.get("FIREBASE_APP_ID", ""),
        "measurementId": os.environ.get("FIREBASE_MEASUREMENT_ID", ""),
        "vapidKey": os.environ.get("FIREBASE_VAPID_KEY", ""),
    }


def broadcast_push(title, body, data=None):
    """Send push to all registered devices (announcements)."""
    if not firebase_enabled():
        return 0
    from models import DeviceToken

    token_rows = DeviceToken.query.all()
    if not token_rows:
        return 0
    try:
        from firebase_admin import messaging

        payload_data = {k: str(v) for k, v in (data or {}).items()}
        payload_data["path"] = (data or {}).get("path", "/")
        sent = 0
        chunk_size = 500
        for i in range(0, len(token_rows), chunk_size):
            chunk_rows = token_rows[i : i + chunk_size]
            message = messaging.MulticastMessage(
                notification=messaging.Notification(title=title, body=body),
                data=payload_data,
                tokens=[row.token for row in chunk_rows],
            )
            response = messaging.send_each_for_multicast(message)
            sent += response.success_count
            if response.failure_count:
                _prune_invalid_tokens(chunk_rows, response)
        return sent
    except Exception as exc:
        logger.warning("FCM broadcast failed: %s", exc)
        return 0
