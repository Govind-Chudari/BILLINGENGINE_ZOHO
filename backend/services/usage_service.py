from models import db, UsageLog, StorageObject
from services.minio_service import get_total_storage_used
from datetime import date, datetime, timedelta
from sqlalchemy import func


# Log an API call for today
def log_api_call(user_id):
    """
    Called after every API request.
    Finds today's log row and increments api_calls by 1.
    If no row exists for today, creates one.
    """
    today = date.today()
    log   = UsageLog.query.filter_by(user_id=user_id, date=today).first()

    if log:
        log.api_calls += 1
    else:
        log = UsageLog(
            user_id=user_id,
            date=today,
            api_calls=1,
            storage_used=0
        )
        db.session.add(log)

    db.session.commit()
    return log


# Update storage snapshot for today
def update_storage_snapshot(user_id, username):
    """
    Called after every upload or delete.
    Recalculates total storage used and saves it for today.
    """
    today        = date.today()
    total_bytes  = get_total_storage_used(username)

    log = UsageLog.query.filter_by(user_id=user_id, date=today).first()

    if log:
        log.storage_used = total_bytes
    else:
        log = UsageLog(
            user_id=user_id,
            date=today,
            storage_used=total_bytes,
            api_calls=0
        )
        db.session.add(log)

    db.session.commit()
    return log


# Today's usage for a user
def get_today_usage(user_id, username):
    """
    Returns today's usage snapshot.
    If no log exists yet today, returns live data from MinIO.
    """
    today = date.today()
    log   = UsageLog.query.filter_by(user_id=user_id, date=today).first()

    if log:
        storage_bytes = log.storage_used
        api_calls     = log.api_calls
    else:
        storage_bytes = get_total_storage_used(username)
        api_calls     = 0

    total_files = StorageObject.query.filter_by(user_id=user_id).count()

    return {
        "date":              today.isoformat(),
        "storage_used_bytes": storage_bytes,
        "storage_used_kb":   round(storage_bytes / 1024, 2),
        "storage_used_mb":   round(storage_bytes / (1024 * 1024), 4),
        "api_calls_today":   api_calls,
        "total_files":       total_files
    }


# GET: Last N days of usage history
def get_usage_history(user_id, days=30):
    """
    Returns daily usage for the last N days.
    Fills in 0 for days with no activity (so charts have no gaps).
    """
    end_date   = date.today()
    start_date = end_date - timedelta(days=days - 1)

    logs = UsageLog.query.filter(
        UsageLog.user_id == user_id,
        UsageLog.date    >= start_date,
        UsageLog.date    <= end_date
    ).order_by(UsageLog.date.asc()).all()

    log_map = {str(log.date): log for log in logs}

    history = []
    current = start_date
    while current <= end_date:
        date_str = current.isoformat()
        log      = log_map.get(date_str)

        history.append({
            "date":              date_str,
            "storage_used_bytes": log.storage_used if log else 0,
            "storage_used_mb":   round(log.storage_used / (1024 * 1024), 4) if log else 0,
            "api_calls":         log.api_calls if log else 0,
        })
        current += timedelta(days=1)

    return history


# Monthly summary 
def get_monthly_summary(user_id, year, month):
    """
    Summarises usage for a specific month.
    This is what the billing engine reads on Day 8.

    Returns:
    - avg_storage_bytes: average storage used per day that month
    - total_api_calls:   total API calls that month
    - days_active:       how many days the user was active
    - peak_storage:      highest storage recorded in that month
    """
    from calendar import monthrange

    _, last_day  = monthrange(year, month)
    start_date   = date(year, month, 1)
    end_date     = date(year, month, last_day)

    logs = UsageLog.query.filter(
        UsageLog.user_id == user_id,
        UsageLog.date    >= start_date,
        UsageLog.date    <= end_date
    ).all()

    if not logs:
        return {
            "year":               year,
            "month":              month,
            "month_label":        f"{year}-{str(month).zfill(2)}",
            "avg_storage_bytes":  0,
            "avg_storage_mb":     0,
            "peak_storage_bytes": 0,
            "peak_storage_mb":    0,
            "total_api_calls":    0,
            "days_active":        0,
            "days_in_month":      last_day
        }

    total_storage  = sum(log.storage_used for log in logs)
    peak_storage   = max(log.storage_used for log in logs)
    total_api      = sum(log.api_calls    for log in logs)
    days_active    = len(logs)
    avg_storage    = total_storage // days_active if days_active > 0 else 0

    return {
        "year":               year,
        "month":              month,
        "month_label":        f"{year}-{str(month).zfill(2)}",
        "avg_storage_bytes":  avg_storage,
        "avg_storage_mb":     round(avg_storage    / (1024 * 1024), 4),
        "peak_storage_bytes": peak_storage,
        "peak_storage_mb":    round(peak_storage   / (1024 * 1024), 4),
        "total_api_calls":    total_api,
        "days_active":        days_active,
        "days_in_month":      last_day
    }


# Current month summary 
def get_current_month_summary(user_id):
    today = date.today()
    return get_monthly_summary(user_id, today.year, today.month)


# All-time stats for a user
def get_alltime_stats(user_id):
    """
    Total API calls and days active across entire account lifetime.
    Used in admin panel and user profile.
    """
    result = db.session.query(
        func.sum(UsageLog.api_calls).label("total_api_calls"),
        func.count(UsageLog.id).label("total_days_logged"),
        func.max(UsageLog.storage_used).label("peak_storage_ever")
    ).filter(UsageLog.user_id == user_id).first()

    total_files = StorageObject.query.filter_by(user_id=user_id).count()

    return {
        "total_api_calls_ever": int(result.total_api_calls or 0),
        "total_days_logged":    int(result.total_days_logged or 0),
        "peak_storage_bytes":   int(result.peak_storage_ever or 0),
        "peak_storage_mb":      round((result.peak_storage_ever or 0) / (1024 * 1024), 4),
        "total_files_stored":   total_files
    }