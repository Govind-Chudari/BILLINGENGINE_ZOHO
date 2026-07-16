from celery import Celery
from celery.schedules import crontab
import os


def make_celery(app=None):
    """
    Creates and configures the Celery instance.
    Can be called with or without a Flask app context.
    """
    broker_url  = os.environ.get("REDIS_URL", "redis://localhost:6379/0")
    backend_url = os.environ.get("REDIS_URL", "redis://localhost:6379/0")

    celery = Celery(
        "billflow",
        broker=broker_url,
        backend=backend_url,
        include=["tasks"]          
    )

    celery.conf.update(
        timezone="Asia/Kolkata",
        enable_utc=True,

        task_serializer="json",
        result_serializer="json",
        accept_content=["json"],

        result_expires=86400,

        task_acks_late=True,
        task_reject_on_worker_lost=True,

        beat_schedule={

            "monthly-invoice-generation": {
                "task":     "tasks.generate_all_invoices",
                "schedule": crontab(hour=2, minute=0, day_of_month=1),
            },

            "daily-storage-alerts": {
                "task":     "tasks.send_storage_alerts",
                "schedule": crontab(hour=9, minute=0),
            },

            "daily-usage-digest": {
                "task":     "tasks.send_daily_digest",
                "schedule": crontab(hour=8, minute=0),
            },

            "hourly-usage-snapshot": {
                "task":     "tasks.take_usage_snapshot",
                "schedule": crontab(minute=0),    
            },
        }
    )

    if app:
        class ContextTask(celery.Task):
            def __call__(self, *args, **kwargs):
                with app.app_context():
                    return self.run(*args, **kwargs)
        celery.Task = ContextTask

    return celery


celery = make_celery()