from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db, User, StorageObject, UsageLog, Invoice
from services.usage_service import get_monthly_summary, get_alltime_stats
from services.billing_service import calculate_bill, generate_invoice
from services.minio_service import get_total_storage_used
from sqlalchemy import func
from datetime import date, datetime

admin_bp = Blueprint("admin", __name__)


# Check if current user is admin
def require_admin():
    """
    Returns (user, error_response) tuple.
    If user is not admin, error_response is set.
    """
    user_id = get_jwt_identity()
    user    = User.query.get(int(user_id))

    if not user:
        return None, (jsonify({"error": "User not found"}), 404)

    if user.role != "admin":
        return None, (jsonify({
            "error": "Admin access required",
            "hint":  "Your account does not have admin privileges"
        }), 403)

    return user, None


# admin home stats
@admin_bp.route("/api/admin/overview", methods=["GET"])
@jwt_required()
def overview():
    admin, err = require_admin()
    if err: return err

    total_users  = User.query.filter_by(role="user").count()
    admin_users  = User.query.filter_by(role="admin").count()

    total_files  = StorageObject.query.count()
    storage_result = db.session.query(
        func.sum(StorageObject.file_size)
    ).scalar() or 0

    today = date.today()
    active_today = db.session.query(
        func.count(func.distinct(UsageLog.user_id))
    ).filter(UsageLog.date == today).scalar() or 0

    paid_revenue = db.session.query(
        func.sum(Invoice.total_amount)
    ).filter_by(status="paid").scalar() or 0

    total_billed = db.session.query(
        func.sum(Invoice.total_amount)
    ).scalar() or 0

    total_invoices  = Invoice.query.count()
    pending_invoices = Invoice.query.filter_by(status="generated").count()

    this_month_start = date.today().replace(day=1)
    new_this_month = User.query.filter(
        User.created_at >= this_month_start
    ).count()

    return jsonify({
        "users": {
            "total":         total_users,
            "admins":        admin_users,
            "new_this_month": new_this_month,
            "active_today":  active_today
        },
        "storage": {
            "total_files":       total_files,
            "total_bytes":       storage_result,
            "total_mb":          round(storage_result / (1024 * 1024), 2),
            "total_gb":          round(storage_result / (1024 ** 3),   4),
        },
        "billing": {
            "total_invoices":   total_invoices,
            "pending_invoices": pending_invoices,
            "paid_revenue":     round(paid_revenue, 4),
            "total_billed":     round(total_billed, 4),
        }
    }), 200


# LIST ALL USERS
@admin_bp.route("/api/admin/users", methods=["GET"])
@jwt_required()
def list_users():
    admin, err = require_admin()
    if err: return err

    search   = request.args.get("search",  "").lower()
    role_filter = request.args.get("role", "all")
    sort_by  = request.args.get("sort",   "created_at")

    query = User.query

    if search:
        query = query.filter(
            db.or_(
                User.username.ilike(f"%{search}%"),
                User.email.ilike(f"%{search}%")
            )
        )

    if role_filter != "all":
        query = query.filter_by(role=role_filter)

    if sort_by == "username":
        query = query.order_by(User.username.asc())
    elif sort_by == "files":
        query = query.outerjoin(StorageObject).group_by(User.id)\
                     .order_by(func.count(StorageObject.id).desc())
    else:
        query = query.order_by(User.created_at.desc())

    users = query.all()

    users_data = []
    for user in users:
        file_count = StorageObject.query.filter_by(user_id=user.id).count()
        storage_bytes = db.session.query(
            func.sum(StorageObject.file_size)
        ).filter_by(user_id=user.id).scalar() or 0

        this_month = date.today().replace(day=1)
        api_calls_month = db.session.query(
            func.sum(UsageLog.api_calls)
        ).filter(
            UsageLog.user_id == user.id,
            UsageLog.date    >= this_month
        ).scalar() or 0

        invoice_count = Invoice.query.filter_by(user_id=user.id).count()
        total_billed  = db.session.query(
            func.sum(Invoice.total_amount)
        ).filter_by(user_id=user.id).scalar() or 0

        users_data.append({
            **user.to_dict(),
            "stats": {
                "file_count":      file_count,
                "storage_bytes":   storage_bytes,
                "storage_mb":      round(storage_bytes / (1024 * 1024), 2),
                "api_calls_month": int(api_calls_month),
                "invoice_count":   invoice_count,
                "total_billed":    round(total_billed, 4)
            }
        })

    return jsonify({
        "total":  len(users_data),
        "search": search,
        "users":  users_data
    }), 200


# GET SINGLE USER DETAILS
@admin_bp.route("/api/admin/users/<int:user_id>", methods=["GET"])
@jwt_required()
def get_user(user_id):
    admin, err = require_admin()
    if err: return err

    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404

    stats    = get_alltime_stats(user.id)
    today    = date.today()
    summary  = get_monthly_summary(user.id, today.year, today.month)
    invoices = Invoice.query.filter_by(user_id=user.id)\
                            .order_by(Invoice.generated_at.desc())\
                            .limit(5).all()

    return jsonify({
        "user":           user.to_dict(),
        "alltime_stats":  stats,
        "current_month":  summary,
        "recent_invoices": [inv.to_dict() for inv in invoices]
    }), 200


# UPDATE USER ROLE (promote / demote)
@admin_bp.route("/api/admin/users/<int:user_id>/role", methods=["PUT"])
@jwt_required()
def update_role(user_id):
    admin, err = require_admin()
    if err: return err

    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404

    if user.id == admin.id:
        return jsonify({"error": "You cannot change your own role"}), 400

    data = request.get_json() or {}
    new_role = data.get("role")

    if new_role not in ("user", "admin"):
        return jsonify({"error": "Role must be 'user' or 'admin'"}), 400

    user.role = new_role
    db.session.commit()

    return jsonify({
        "message": f"User '{user.username}' role updated to '{new_role}'",
        "user":    user.to_dict()
    }), 200


# ALL INVOICES across all users
@admin_bp.route("/api/admin/invoices", methods=["GET"])
@jwt_required()
def all_invoices():
    admin, err = require_admin()
    if err: return err

    status_filter = request.args.get("status", "all")
    user_filter   = request.args.get("user_id", None)
    month_filter  = request.args.get("month",  None)

    query = Invoice.query

    if status_filter != "all":
        query = query.filter_by(status=status_filter)

    if user_filter:
        query = query.filter_by(user_id=int(user_filter))

    if month_filter:
        query = query.filter_by(month=month_filter)

    invoices = query.order_by(Invoice.generated_at.desc()).all()

    result = []
    for inv in invoices:
        user = User.query.get(inv.user_id)
        inv_dict = inv.to_dict()
        inv_dict["username"] = user.username if user else "deleted"
        result.append(inv_dict)

    total_revenue = sum(inv.total_amount for inv in invoices)
    paid_revenue  = sum(
        inv.total_amount for inv in invoices if inv.status == "paid"
    )

    return jsonify({
        "total_invoices": len(result),
        "total_revenue":  round(total_revenue, 4),
        "paid_revenue":   round(paid_revenue,  4),
        "pending_amount": round(total_revenue - paid_revenue, 4),
        "invoices":       result
    }), 200


# FORCE GENERATE invoice for any user
@admin_bp.route("/api/admin/users/<int:user_id>/generate-invoice",
                methods=["POST"])
@jwt_required()
def admin_generate_invoice(user_id):
    admin, err = require_admin()
    if err: return err

    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404

    data  = request.get_json() or {}
    today = date.today()
    year  = int(data.get("year",  today.year))
    month = int(data.get("month", today.month))

    result = generate_invoice(user_id, year, month)

    return jsonify({
        "username": user.username,
        **result
    }), 201


# MARK any invoice as paid 
@admin_bp.route("/api/admin/invoices/<int:invoice_id>/pay",
                methods=["POST"])
@jwt_required()
def admin_pay_invoice(invoice_id):
    admin, err = require_admin()
    if err: return err

    invoice = Invoice.query.get(invoice_id)
    if not invoice:
        return jsonify({"error": "Invoice not found"}), 404

    invoice.status = "paid"
    db.session.commit()

    return jsonify({
        "message": f"Invoice #{invoice_id} marked as paid",
        "invoice": invoice.to_dict()
    }), 200


# PLATFORM USAGE STATS 
@admin_bp.route("/api/admin/platform-stats", methods=["GET"])
@jwt_required()
def platform_stats():
    admin, err = require_admin()
    if err: return err

    from datetime import timedelta
    end   = date.today()
    start = end - timedelta(days=13)

    daily = db.session.query(
        UsageLog.date,
        func.sum(UsageLog.api_calls).label("total_api"),
        func.sum(UsageLog.storage_used).label("total_storage"),
        func.count(func.distinct(UsageLog.user_id)).label("active_users")
    ).filter(
        UsageLog.date >= start,
        UsageLog.date <= end
    ).group_by(UsageLog.date).all()

    daily_map = {str(row.date): row for row in daily}
    history   = []
    current   = start
    while current <= end:
        ds  = str(current)
        row = daily_map.get(ds)
        history.append({
            "date":         ds,
            "label":        current.strftime("%d %b"),
            "api_calls":    int(row.total_api)    if row else 0,
            "storage_mb":   round((row.total_storage or 0) / (1024*1024), 2) if row else 0,
            "active_users": int(row.active_users) if row else 0
        })
        current += timedelta(days=1)

    top_storage = db.session.query(
        User.username,
        func.sum(StorageObject.file_size).label("total_bytes")
    ).join(StorageObject, User.id == StorageObject.user_id)\
     .group_by(User.id)\
     .order_by(func.sum(StorageObject.file_size).desc())\
     .limit(5).all()

    return jsonify({
        "daily_history": history,
        "top_users_by_storage": [
            {
                "username":   row.username,
                "storage_mb": round((row.total_bytes or 0) / (1024*1024), 2)
            }
            for row in top_storage
        ]
    }), 200


# DELETE USER
@admin_bp.route("/api/admin/users/<int:user_id>", methods=["DELETE"])
@jwt_required()
def delete_user(user_id):
    admin, err = require_admin()
    if err: return err

    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404

    if user.id == admin.id:
        return jsonify({"error": "You cannot delete yourself"}), 400

    # Delete related records explicitly to avoid FK constraint failures
    StorageObject.query.filter_by(user_id=user.id).delete()
    UsageLog.query.filter_by(user_id=user.id).delete()
    Invoice.query.filter_by(user_id=user.id).delete()

    db.session.delete(user)
    db.session.commit()

    return jsonify({"message": f"User '{user.username}' and all associated data have been deleted"}), 200