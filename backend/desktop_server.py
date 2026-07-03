"""Production entry point for the ManageX desktop app."""

import os
import shutil
import sys

if getattr(sys, "frozen", False):
    os.chdir(sys._MEIPASS)

from app import create_app, seed_database

PORT = int(os.environ.get("MANAGEX_PORT", "51234"))


def sync_bundled_uploads():
    data_dir = os.environ.get("MANAGEX_DATA_DIR")
    if not data_dir:
        return
    dest = os.path.join(data_dir, "uploads", "profile_photos")
    os.makedirs(dest, exist_ok=True)
    if getattr(sys, "frozen", False):
        src = os.path.join(sys._MEIPASS, "uploads", "profile_photos")
    else:
        src = os.path.join(os.path.dirname(__file__), "uploads", "profile_photos")
    if not os.path.isdir(src):
        return
    for name in os.listdir(src):
        if name.startswith("."):
            continue
        target = os.path.join(dest, name)
        if not os.path.exists(target):
            shutil.copy2(os.path.join(src, name), target)


sync_bundled_uploads()
application = create_app()

with application.app_context():
    seed_database()

if __name__ == "__main__":
    application.run(
        host="127.0.0.1",
        port=PORT,
        debug=False,
        use_reloader=False,
        threaded=True,
    )
