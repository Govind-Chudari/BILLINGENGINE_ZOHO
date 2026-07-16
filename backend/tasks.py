from celery_app import celery
from datetime import date, datetime
import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart


# Flask App Loader (Prevents Circular Import)
def get_app():
    """
    Dynamically imports and creates the Flask app.
    This avoids circular import issues.
    """
    from app import create_app
    return create_app()


# Email Utility
def send_email(to_email, subject, html_body):
    """
    Sends an email using SMTP.
    Falls back to console print if SMTP not configured.
    """
    smtp_host = os.environ.get("SMTP_HOST", "")
    smtp_port = int(os.environ.get("SMTP_PORT", "587"))
    smtp_user = os.environ.get("SMTP_USER", "")
    smtp_pass = os.environ.get("SMTP_PASS", "")
    from_email = os.environ.get("FROM_EMAIL", smtp_user)

    if not smtp_host or not smtp_user:
        print(f"\n📧 [EMAIL SIMULATED]")
        print(f"   To:      {to_email}")
        print(f"   Subject: {subject}")
        print(f"   Body:    {html_body[:200]}...\n")
        return True

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = from_email
        msg["To"] = to_email
        msg.attach(MIMEText(html_body, "html"))

        with smtplib.SMTP(smtp_host, smtp_port) as server:
            server.ehlo()
            server.starttls()
            server.login(smtp_user, smtp_pass)
            server.sendmail(from_email, to_email, msg.as_string())

        print(f"✅ Email sent to {to_email}")
        return True

    except Exception as e:
        print(f"❌ Email failed to {to_email}: {e}")
        return False


# Monthly Invoice Generation
@celery.task(name="tasks.generate_all_invoices", bind=True, max_retries=3)
def generate_all_invoices(self):
    app = get_app()

    with app.app_context():
        from models import User
        from services.billing_service import generate_invoice

        today = date.today()

        if today.month == 1:
            bill_year = today.year - 1
            bill_month = 12
        else:
            bill_year = today.year
            bill_month = today.month - 1

        print(f"🧾 Generating invoices for {bill_year}-{str(bill_month).zfill(2)}")

        users = User.query.filter_by(role="user").all()
        results = {"generated": 0, "skipped": 0, "failed": 0}

        for user in users:
            try:
                result = generate_invoice(user.id, bill_year, bill_month)

                if result["already_existed"]:
                    results["skipped"] += 1
                else:
                    results["generated"] += 1
                    send_invoice_email(
                        user.email,
                        user.username,
                        result["invoice"],
                        bill_year,
                        bill_month
                    )

            except Exception as e:
                print(f"❌ Invoice failed for {user.username}: {e}")
                results["failed"] += 1

        print(f"✅ Invoice generation complete: {results}")
        return results


# Storage Alerts
@celery.task(name="tasks.send_storage_alerts", bind=True, max_retries=3)
def send_storage_alerts(self):
    app = get_app()

    with app.app_context():
        from models import User
        from services.minio_service import get_storage_summary

        users = User.query.filter_by(role="user").all()
        alerted = 0

        for user in users:
            try:
                summary = get_storage_summary(user.username)
                pct = summary["percent_used"]

                if pct < 80:
                    continue

                level = "🚨 CRITICAL" if pct >= 95 else "⚠️ WARNING"

                html = f"""
                <h2>BillFlow Storage Alert</h2>
                <p>Hi {user.username},</p>
                <p>{level}: Your storage is {pct}% full.</p>
                <p>Used: {summary['used_readable']}</p>
                <p>Remaining: {summary['remaining_readable']}</p>
                """

                if send_email(
                    user.email,
                    f"BillFlow Storage Alert — {pct}% Used",
                    html
                ):
                    alerted += 1

            except Exception as e:
                print(f"❌ Storage alert failed for {user.username}: {e}")

        print(f"✅ Storage alerts sent: {alerted}")
        return {"alerted": alerted}


# Daily Usage Digest
@celery.task(name="tasks.send_daily_digest", bind=True, max_retries=3)
def send_daily_digest(self):
    app = get_app()

    with app.app_context():
        from models import User
        from services.usage_service import (
            get_today_usage,
            get_current_month_summary
        )
        from services.billing_service import calculate_bill

        users = User.query.filter_by(role="user").all()
        sent = 0
        today = date.today()

        for user in users:
            try:
                usage = get_today_usage(user.id, user.username)
                monthly = get_current_month_summary(user.id)
                bill = calculate_bill(user.id, today.year, today.month)

                html = f"""
                <h2>Your BillFlow Daily Summary</h2>
                <p>Hi {user.username},</p>
                <p>Storage Used Today: {usage['storage_used_mb']} MB</p>
                <p>API Calls Today: {usage['api_calls_today']}</p>
                <p>Estimated Bill: ₹{bill['costs']['total_amount']}</p>
                """

                if send_email(
                    user.email,
                    f"BillFlow Daily Summary — {today}",
                    html
                ):
                    sent += 1

            except Exception as e:
                print(f"❌ Daily digest failed for {user.username}: {e}")

        print(f"✅ Daily digests sent: {sent}")
        return {"sent": sent}


# Hourly Usage Snapshot
@celery.task(name="tasks.take_usage_snapshot")
def take_usage_snapshot():
    app = get_app()

    with app.app_context():
        from models import User, StorageObject, db
        from sqlalchemy import func

        total_users = User.query.filter_by(role="user").count()
        total_files = StorageObject.query.count()
        total_bytes = db.session.query(
            func.sum(StorageObject.file_size)
        ).scalar() or 0

        snapshot = {
            "timestamp": datetime.now().isoformat(),
            "total_users": total_users,
            "total_files": total_files,
            "total_mb": round(total_bytes / (1024 * 1024), 2),
        }

        print(f"📊 Snapshot: {snapshot}")
        return snapshot


# Invoice Email Template
def send_invoice_email(email, username, invoice, year, month):
    from calendar import month_name

    month_label = f"{month_name[month]} {year}"

    html = f"""
    <h2>Your BillFlow Invoice — {month_label}</h2>
    <p>Hi {username},</p>
    <p>Total Due: ₹{invoice['costs']['total_amount']}</p>
    """

    send_email(email, f"BillFlow Invoice — {month_label}", html)