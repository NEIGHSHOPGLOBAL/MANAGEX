#!/usr/bin/env python3
"""Run scheduled notification reminders. Add to cron every minute:
* * * * * cd /opt/managex/backend && CRON_SECRET=your-secret ./venv/bin/python scripts/notification_cron.py
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app
from reminder_service import run_reminder_checks

if __name__ == "__main__":
    app = create_app()
    with app.app_context():
        sent = run_reminder_checks()
        print(f"Reminders sent: {sent}")
