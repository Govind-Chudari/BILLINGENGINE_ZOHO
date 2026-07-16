from models import db, Invoice, User, UsageLog
from services.minio_service import get_total_storage_used
from config import Config
from datetime import date, datetime, timedelta
from calendar import monthrange
from services.blockchain import generate_invoice_hash, anchor_hash_to_chain


# ─────────────────────────────────────────────────────────────────────────────
# CORE HELPER: Calculate bill for a specific date range
# ─────────────────────────────────────────────────────────────────────────────
def calculate_bill_for_period(user_id, start_date, end_date, api_offset=0):
    """
    Calculates the bill for a user for a specific date range (start_date to end_date inclusive).
    Does NOT save anything — just returns the numbers.

    api_offset: number of API calls already billed from the start_date's log in a previous
                invoice (pre-payment calls on the same day). These are subtracted so the new
                invoice only charges for API calls AFTER the last payment.

    Key formula:
    - avg_storage: average of daily storage snapshots across the period (snapshot, always current)
    - api_calls:   sum of all API calls in the period, minus api_offset
    - cost:        avg_storage_gb * days_in_period * rate + api_calls * rate
    """
    from models import UsageLog

    logs = UsageLog.query.filter(
        UsageLog.user_id == user_id,
        UsageLog.date    >= start_date,
        UsageLog.date    <= end_date
    ).all()

    days_in_period = (end_date - start_date).days + 1

    if not logs:
        return _empty_bill(start_date, end_date, days_in_period)

    total_storage  = sum(log.storage_used for log in logs)
    raw_api        = sum(log.api_calls    for log in logs)
    # Subtract API calls already billed in the previous invoice's billing_to day
    total_api      = max(0, raw_api - api_offset)
    days_active    = len(logs)
    avg_storage    = total_storage // days_active if days_active > 0 else 0

    # Free Tier deductions
    billable_storage_bytes = max(0, avg_storage  - Config.FREE_STORAGE_BYTES)
    billable_api_calls     = max(0, total_api    - Config.FREE_API_CALLS)

    # Cost calculations
    avg_storage_gb = billable_storage_bytes / (1024 ** 3)
    storage_cost   = avg_storage_gb * days_in_period * Config.PRICE_STORAGE_PER_GB_DAY
    api_cost       = billable_api_calls * Config.PRICE_API_PER_CALL
    total          = storage_cost + api_cost

    return {
        "period_start":  start_date.isoformat(),
        "period_end":    end_date.isoformat(),
        "days_in_period": days_in_period,

        "usage": {
            "avg_storage_bytes": avg_storage,
            "avg_storage_mb":    round(avg_storage / (1024 * 1024), 4),
            "avg_storage_gb":    round(avg_storage / (1024 ** 3), 6),
            "total_api_calls":   total_api,
            "days_active":       days_active,
        },

        "billable": {
            "storage_bytes": billable_storage_bytes,
            "storage_gb":    round(avg_storage_gb, 6),
            "api_calls":     billable_api_calls,
        },

        "free_tier": {
            "free_storage_bytes": Config.FREE_STORAGE_BYTES,
            "free_storage_gb":    round(Config.FREE_STORAGE_BYTES / (1024 ** 3), 2),
            "free_api_calls":     Config.FREE_API_CALLS,
        },

        "rates": {
            "storage_per_gb_day": Config.PRICE_STORAGE_PER_GB_DAY,
            "api_per_call":       Config.PRICE_API_PER_CALL
        },

        "costs": {
            "storage_cost": round(storage_cost, 4),
            "api_cost":     round(api_cost, 4),
            "total_amount": round(total, 4)
        },

        "note": "Free tier applied: 1 GB storage and 1000 API calls included per billing period"
    }


def _empty_bill(start_date, end_date, days_in_period):
    return {
        "period_start":   start_date.isoformat(),
        "period_end":     end_date.isoformat(),
        "days_in_period": days_in_period,
        "usage":     {"avg_storage_bytes": 0, "avg_storage_mb": 0, "avg_storage_gb": 0, "total_api_calls": 0, "days_active": 0},
        "billable":  {"storage_bytes": 0, "storage_gb": 0, "api_calls": 0},
        "free_tier": {"free_storage_bytes": Config.FREE_STORAGE_BYTES, "free_storage_gb": round(Config.FREE_STORAGE_BYTES / (1024 ** 3), 2), "free_api_calls": Config.FREE_API_CALLS},
        "rates":     {"storage_per_gb_day": Config.PRICE_STORAGE_PER_GB_DAY, "api_per_call": Config.PRICE_API_PER_CALL},
        "costs":     {"storage_cost": 0.0, "api_cost": 0.0, "total_amount": 0.0},
        "note": "No usage recorded in this period"
    }


# ─────────────────────────────────────────────────────────────────────────────
# CALCULATE BILL (legacy / compat wrapper)
# ─────────────────────────────────────────────────────────────────────────────
def calculate_bill(user_id, year, month):
    """
    Calculates only the UNPAID portion for the current open billing window.
    """
    today = date.today()
    start, end = _get_open_billing_window(user_id, year, month, today)
    if start is None:
        # No new usage window — return a zero bill
        bill = _empty_bill(date(year, month, 1), today, today.day)
    else:
        # Check API offset for current window estimate
        last_paid_inv = Invoice.query.filter_by(
            user_id=user_id, status="paid"
        ).order_by(Invoice.paid_at.desc()).first()
        api_offset = 0
        if (last_paid_inv and last_paid_inv.billing_to and
                start and last_paid_inv.billing_to == start):
            api_offset = last_paid_inv.billing_to_api_calls or 0
        bill = calculate_bill_for_period(user_id, start, end, api_offset=api_offset)
    # Tag with year/month for backwards compat
    bill["year"]        = year
    bill["month"]       = month
    bill["month_label"] = f"{year}-{str(month).zfill(2)}"
    return bill


def _get_open_billing_window(user_id, year, month, today):
    """
    Returns (start_date, end_date) for the CURRENT open (unpaid) billing window.

    Logic:
    - Look for the most recent PAID invoice for this user (any month).
    - If found, billing window starts from the SAME day as that payment.
    - If none found, billing window starts from the 1st of the requested month.
    - End date is always today (or last day of month if month is in the past).
    """
    month_label = f"{year}-{str(month).zfill(2)}"
    _, last_day = monthrange(year, month)

    # Find the latest paid invoice for this user
    last_paid = Invoice.query.filter_by(
        user_id=user_id, status="paid"
    ).order_by(Invoice.paid_at.desc()).first()

    if last_paid and last_paid.paid_at:
        # Start from the SAME day as payment (not the next day).
        # UsageLog.storage_used is a live snapshot — it's overwritten on every
        # upload/delete, so today's entry already reflects post-payment uploads.
        start_date = last_paid.paid_at.date()
    else:
        # No payments ever: start from 1st of this month
        start_date = date(year, month, 1)

    # End date: today if current month, last day if past month
    if year == today.year and month == today.month:
        end_date = today
    else:
        end_date = date(year, month, last_day)

    # start_date can never exceed end_date now (both are today or past),
    # but guard just in case.
    if start_date > end_date:
        return None, None

    return start_date, end_date


# ─────────────────────────────────────────────────────────────────────────────
# GENERATE INVOICE: Always creates a fresh invoice for the open window
# ─────────────────────────────────────────────────────────────────────────────
def generate_invoice(user_id, year, month):
    """
    NEW BEHAVIOR: Always creates a fresh invoice each time.
    - Finds the open (unpaid) billing window since last payment.
    - If there's already an UNPAID invoice for this window, updates it.
    - If the last invoice is PAID, creates a brand new invoice for new usage.
    - Paid invoices are NEVER modified.
    """
    today = date.today()
    month_label = f"{year}-{str(month).zfill(2)}"

    start_date, end_date = _get_open_billing_window(user_id, year, month, today)

    # ── Find last paid invoice (needed for api_offset and guards) ─────────────
    from models import StorageObject
    last_paid_inv = Invoice.query.filter_by(
        user_id=user_id, status="paid"
    ).order_by(Invoice.paid_at.desc()).first()

    # ── Compute API offset ────────────────────────────────────────────────────
    # api_calls in UsageLog are cumulative for the day. If the last paid
    # invoice's billing_to == start_date (same day), some calls from that day
    # were already billed. Subtract them so we only charge NEW calls.
    api_offset = 0
    if (last_paid_inv and last_paid_inv.billing_to and
            start_date and last_paid_inv.billing_to == start_date):
        api_offset = last_paid_inv.billing_to_api_calls or 0

    bill = calculate_bill_for_period(user_id, start_date, end_date, api_offset=api_offset)

    # ── Get current api_calls count for end_date (to store on this invoice) ──
    end_date_log = UsageLog.query.filter_by(
        user_id=user_id, date=end_date
    ).first()
    current_end_api_calls = end_date_log.api_calls if end_date_log else 0

    # ── Guard: No new billable activity since last payment ───────────────────
    if start_date is None:
        return {
            "message": "No new usage to bill. Upload files or use the API first.",
            "invoice":        last_paid_inv.to_dict() if last_paid_inv else None,
            "bill_breakdown": None,
            "already_existed": True,
            "no_new_usage":   True
        }

    if last_paid_inv and last_paid_inv.paid_at:
        new_files_since_payment = StorageObject.query.filter(
            StorageObject.user_id == user_id,
            StorageObject.uploaded_at >= last_paid_inv.paid_at
        ).count()

        # Did user make any new API calls since the last invoice?
        new_api_calls = bill["usage"]["total_api_calls"]

        bill_changed = abs(bill["costs"]["total_amount"] - last_paid_inv.total_amount) > 0.0001

        if new_files_since_payment == 0 and new_api_calls == 0 and not bill_changed:
            return {
                "message": "No new usage since your last payment. Upload files or use the API first, then generate a new invoice.",
                "invoice":        last_paid_inv.to_dict(),
                "bill_breakdown": None,
                "already_existed": True,
                "no_new_usage":   True
            }
    # ─────────────────────────────────────────────────────────────────────────

    # Look for the most recent UNPAID invoice in this month for this user
    existing_unpaid = Invoice.query.filter_by(
        user_id=user_id,
        month=month_label,
        status="generated"
    ).order_by(Invoice.generated_at.desc()).first()

    if existing_unpaid:
        # Update the existing unpaid invoice with fresh numbers
        existing_unpaid.billing_from          = start_date
        existing_unpaid.billing_to            = end_date
        existing_unpaid.billing_to_api_calls  = current_end_api_calls  # snapshot for next-cycle offset
        existing_unpaid.avg_storage_bytes     = bill["usage"]["avg_storage_bytes"]
        existing_unpaid.total_api_calls       = bill["usage"]["total_api_calls"]
        existing_unpaid.days_active           = bill["usage"]["days_active"]
        existing_unpaid.storage_cost          = bill["costs"]["storage_cost"]
        existing_unpaid.api_cost              = bill["costs"]["api_cost"]
        existing_unpaid.total_amount          = bill["costs"]["total_amount"]
        existing_unpaid.amount_paid           = 0.0
        existing_unpaid.generated_at          = datetime.utcnow()

        existing_unpaid.invoice_hash = generate_invoice_hash(existing_unpaid)
        db.session.commit()

        tx_hash = anchor_hash_to_chain(existing_unpaid.invoice_hash)
        if tx_hash:
            existing_unpaid.chain_tx_hash = tx_hash
            db.session.commit()

        return {
            "message":        "Invoice updated with latest usage since last payment!",
            "invoice":        existing_unpaid.to_dict(),
            "bill_breakdown": bill,
            "already_existed": True
        }

    # Create a brand new invoice
    invoice = Invoice(
        user_id=user_id,
        month=month_label,
        year=year,
        month_number=month,
        billing_from=start_date,
        billing_to=end_date,
        billing_to_api_calls=current_end_api_calls,  # snapshot for next-cycle offset
        avg_storage_bytes=bill["usage"]["avg_storage_bytes"],
        total_api_calls=bill["usage"]["total_api_calls"],
        days_active=bill["usage"]["days_active"],
        storage_cost=bill["costs"]["storage_cost"],
        api_cost=bill["costs"]["api_cost"],
        total_amount=bill["costs"]["total_amount"],
        amount_paid=0.0,
        rate_storage_per_gb_day=Config.PRICE_STORAGE_PER_GB_DAY,
        rate_api_per_call=Config.PRICE_API_PER_CALL,
        status="generated"
    )

    db.session.add(invoice)
    db.session.commit()

    invoice.invoice_hash = generate_invoice_hash(invoice)
    db.session.commit()

    tx_hash = anchor_hash_to_chain(invoice.invoice_hash)
    if tx_hash:
        invoice.chain_tx_hash = tx_hash
        db.session.commit()

    return {
        "message":        "New invoice generated for usage since last payment!",
        "invoice":        invoice.to_dict(),
        "bill_breakdown": bill,
        "already_existed": False
    }


# ─────────────────────────────────────────────────────────────────────────────
# CURRENT MONTH ESTIMATE (used by frontend dashboard card)
# ─────────────────────────────────────────────────────────────────────────────
def get_current_estimate(user_id):
    """
    Returns a live estimate of charges for the current open billing window.
    Also forecasts what the bill will be at end of month.
    """
    today         = date.today()
    year          = today.year
    month         = today.month
    _, days_in_month = monthrange(year, month)

    current_bill = calculate_bill(user_id, year, month)

    days_elapsed = (today - date(year, month, 1)).days + 1
    days_left    = days_in_month - days_elapsed
    current_total = current_bill["costs"]["total_amount"]

    if days_elapsed > 0 and current_total > 0:
        daily_rate       = current_total / days_elapsed
        forecast_total   = round(daily_rate * days_in_month, 4)
        forecast_storage = round(current_bill["costs"]["storage_cost"] / days_elapsed * days_in_month, 4)
        forecast_api     = round(current_bill["costs"]["api_cost"]     / days_elapsed * days_in_month, 4)
    else:
        forecast_total = forecast_storage = forecast_api = 0

    return {
        "current_date":     today.isoformat(),
        "day_of_month":     today.day,
        "days_in_month":    days_in_month,
        "days_remaining":   days_left,
        "progress_percent": round((today.day / days_in_month) * 100, 1),
        "current_bill":     current_bill,
        "forecast": {
            "storage_cost": forecast_storage,
            "api_cost":     forecast_api,
            "total_amount": forecast_total,
            "note":         f"Based on your usage in the last {days_elapsed} days"
        }
    }


# ─────────────────────────────────────────────────────────────────────────────
# GET ALL INVOICES for a user
# ─────────────────────────────────────────────────────────────────────────────
def get_user_invoices(user_id):
    """
    Returns all saved invoices for a user, newest first.
    total_spent = sum of all invoice total_amounts (not just paid ones).
    """
    invoices = Invoice.query.filter_by(user_id=user_id)\
                            .order_by(Invoice.generated_at.desc())\
                            .all()
    total_spent = sum(inv.amount_paid for inv in invoices)  # Only actually paid amounts

    return {
        "total_invoices": len(invoices),
        "total_spent":    round(total_spent, 4),
        "invoices":       [inv.to_dict() for inv in invoices]
    }


# ─────────────────────────────────────────────────────────────────────────────
# MARK INVOICE AS PAID (locks it permanently)
# ─────────────────────────────────────────────────────────────────────────────
def mark_invoice_paid(invoice_id, user_id):
    """
    Marks an invoice as PAID and locks it permanently.
    - Sets status = 'paid'
    - Sets amount_paid = total_amount
    - Sets paid_at = now
    After this, subsequent generate_invoice() calls will create a FRESH invoice
    covering only new usage from this moment forward.
    """
    invoice = Invoice.query.filter_by(
        id=invoice_id,
        user_id=user_id
    ).first()

    if not invoice:
        return None, "Invoice not found"

    if invoice.status == "paid":
        return invoice, "Invoice was already marked as paid"

    invoice.status      = "paid"
    invoice.amount_paid = invoice.total_amount
    invoice.paid_at     = datetime.utcnow()
    db.session.commit()

    return invoice, "Invoice marked as paid successfully"