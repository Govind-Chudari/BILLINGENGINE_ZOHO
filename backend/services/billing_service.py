from models import db, Invoice, User
from services.usage_service import get_monthly_summary
from config import Config
from datetime import date, datetime
from calendar import monthrange
from services.blockchain import generate_invoice_hash, anchor_hash_to_chain


# Calculate cost for a user (month)
def calculate_bill(user_id, year, month):
    """
    Calculates the bill for a user for a specific month.
    Does NOT save anything — just returns the numbers.
    Call generate_invoice() to actually save it.

    Steps:
    1. Get monthly usage summary
    2. Apply free tier deductions
    3. Calculate storage cost
    4. Calculate API cost
    5. Return full breakdown
    """
    summary = get_monthly_summary(user_id, year, month)

    avg_storage_bytes = summary["avg_storage_bytes"]
    total_api_calls   = summary["total_api_calls"]
    days_in_month     = summary["days_in_month"]
    days_active       = summary["days_active"]

    # Free Tier 
    # Storage: subtract free 1 GB from average daily storage
    billable_storage_bytes = max(0, avg_storage_bytes - Config.FREE_STORAGE_BYTES)

    # API: subtract free 1000 calls
    billable_api_calls = max(0, total_api_calls - Config.FREE_API_CALLS)

    # Storage Cost 
    # Convert bytes → GB, multiply by days, multiply by rate
    avg_storage_gb  = billable_storage_bytes / (1024 ** 3)
    storage_cost    = avg_storage_gb * days_in_month * Config.PRICE_STORAGE_PER_GB_DAY

    # API Cost 
    api_cost = billable_api_calls * Config.PRICE_API_PER_CALL

    # Total 
    total = storage_cost + api_cost

    return {
        "year":   year,
        "month":  month,
        "month_label": f"{year}-{str(month).zfill(2)}",

        "usage": {
            "avg_storage_bytes":   avg_storage_bytes,
            "avg_storage_mb":      round(avg_storage_bytes / (1024 * 1024), 4),
            "avg_storage_gb":      round(avg_storage_bytes / (1024 ** 3), 6),
            "total_api_calls":     total_api_calls,
            "days_active":         days_active,
            "days_in_month":       days_in_month
        },

        "billable": {
            "storage_bytes":  billable_storage_bytes,
            "storage_gb":     round(avg_storage_gb, 6),
            "api_calls":      billable_api_calls,
        },

        "free_tier": {
            "free_storage_bytes": Config.FREE_STORAGE_BYTES,
            "free_storage_gb":    round(Config.FREE_STORAGE_BYTES / (1024 ** 3), 2),
            "free_api_calls":     Config.FREE_API_CALLS,
            "storage_saved":      round(
                min(avg_storage_bytes, Config.FREE_STORAGE_BYTES) / (1024 ** 3)
                * days_in_month
                * Config.PRICE_STORAGE_PER_GB_DAY, 4
            ),
            "api_saved": round(
                min(total_api_calls, Config.FREE_API_CALLS)
                * Config.PRICE_API_PER_CALL, 4
            )
        },

        "rates": {
            "storage_per_gb_day": Config.PRICE_STORAGE_PER_GB_DAY,
            "api_per_call":       Config.PRICE_API_PER_CALL
        },

        "costs": {
            "storage_cost":  round(storage_cost, 4),
            "api_cost":      round(api_cost, 4),
            "total_amount":  round(total, 4)
        },

        "note": "Free tier applied: 1 GB storage and 1000 API calls per month are free"
    }


# GENERATE: Save invoice to database
def generate_invoice(user_id, year, month):
    """
    Calculates the bill AND saves it as an Invoice record.
    If an invoice already exists for this month, returns it (no duplicates).
    """
    month_label = f"{year}-{str(month).zfill(2)}"

    existing = Invoice.query.filter_by(
        user_id=user_id,
        month=month_label
    ).first()

    if existing:
        return {
            "message":  "Invoice already exists for this month",
            "invoice":  existing.to_dict(),
            "already_existed": True
        }

    bill = calculate_bill(user_id, year, month)

    invoice = Invoice(
        user_id=user_id,
        month=month_label,
        year=year,
        month_number=month,
        avg_storage_bytes=bill["usage"]["avg_storage_bytes"],
        total_api_calls=bill["usage"]["total_api_calls"],
        days_active=bill["usage"]["days_active"],
        storage_cost=bill["costs"]["storage_cost"],
        api_cost=bill["costs"]["api_cost"],
        total_amount=bill["costs"]["total_amount"],
        rate_storage_per_gb_day=Config.PRICE_STORAGE_PER_GB_DAY,
        rate_api_per_call=Config.PRICE_API_PER_CALL,
        status="generated"
    )

    db.session.add(invoice)
    db.session.commit()

    # --- On-Chain Proof Logic ---
    # 1. Generate local hash
    invoice.invoice_hash = generate_invoice_hash(invoice)
    db.session.commit()

    # 2. Anchor to blockchain (this might take a few seconds)
    # Since this is usually called by a background task, sync execution is okay
    tx_hash = anchor_hash_to_chain(invoice.invoice_hash)
    if tx_hash:
        invoice.chain_tx_hash = tx_hash
        db.session.commit()
    # ----------------------------

    return {
        "message":        "Invoice generated successfully!",
        "invoice":        invoice.to_dict(),
        "bill_breakdown": bill,
        "already_existed": False
    }


# Current month live estimate
def get_current_estimate(user_id):
    """
    Calculates what the bill WOULD BE if the month ended today.
    Also forecasts what the bill will be at end of month.

    This is what the frontend shows as 'Estimated Bill'.
    """
    today         = date.today()
    year          = today.year
    month         = today.month
    day_of_month  = today.day
    _, days_in_month = monthrange(year, month)

    current_bill = calculate_bill(user_id, year, month)

    days_elapsed = day_of_month
    days_left    = days_in_month - days_elapsed

    current_total = current_bill["costs"]["total_amount"]

    if days_elapsed > 0:
        daily_rate       = current_total / days_elapsed
        forecast_total   = round(daily_rate * days_in_month, 4)
        forecast_storage = round(
            current_bill["costs"]["storage_cost"] / days_elapsed * days_in_month, 4
        )
        forecast_api = round(
            current_bill["costs"]["api_cost"] / days_elapsed * days_in_month, 4
        )
    else:
        forecast_total   = 0
        forecast_storage = 0
        forecast_api     = 0

    return {
        "current_date":    today.isoformat(),
        "day_of_month":    day_of_month,
        "days_in_month":   days_in_month,
        "days_remaining":  days_left,
        "progress_percent": round((day_of_month / days_in_month) * 100, 1),

        "current_bill": current_bill,

        "forecast": {
            "storage_cost":  forecast_storage,
            "api_cost":      forecast_api,
            "total_amount":  forecast_total,
            "note": f"Based on your usage in the last {days_elapsed} days"
        }
    }


# All invoices for a user
def get_user_invoices(user_id):
    """
    Returns all saved invoices for a user, newest first.
    """
    invoices = Invoice.query.filter_by(user_id=user_id)\
                            .order_by(Invoice.year.desc(),
                                      Invoice.month_number.desc())\
                            .all()
    total_spent = sum(inv.total_amount for inv in invoices)

    return {
        "total_invoices": len(invoices),
        "total_spent":    round(total_spent, 4),
        "invoices":       [inv.to_dict() for inv in invoices]
    }


# Mark invoice as paid
def mark_invoice_paid(invoice_id, user_id):
    """
    Marks an invoice as paid.
    user_id check ensures users can only update their own invoices.
    """
    invoice = Invoice.query.filter_by(
        id=invoice_id,
        user_id=user_id
    ).first()

    if not invoice:
        return None, "Invoice not found"

    if invoice.status == "paid":
        return invoice, "Invoice was already marked as paid"

    invoice.status = "paid"
    db.session.commit()

    return invoice, "Invoice marked as paid successfully"