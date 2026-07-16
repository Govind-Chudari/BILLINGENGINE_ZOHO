from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import User
from services.usage_service import (
    get_today_usage,
    get_usage_history,
    get_monthly_summary,
    get_current_month_summary,
    get_alltime_stats
)
from services.fingerprint_service import score_today_anomaly
from datetime import date

usage_bp = Blueprint("usage", __name__)


def get_current_user():
    user_id = get_jwt_identity()
    return User.query.get(int(user_id))


# TODAY'S usage snapshot
@usage_bp.route("/api/usage/today", methods=["GET"])
@jwt_required()
def today():
    """
    Returns a live snapshot of today's usage.
    Frontend calls this to update the dashboard in real time.
    """
    user = get_current_user()
    if not user:
        return jsonify({"error": "User not found"}), 404

    data = get_today_usage(user.id, user.username)
    return jsonify({
        "username": user.username,
        "usage":    data
    }), 200


# HISTORY — last N days
@usage_bp.route("/api/usage/history", methods=["GET"])
@jwt_required()
def history():
    """
    Returns daily usage for the last N days.
    ?days=7  → last 7 days
    ?days=30 → last 30 days (default)
    ?days=90 → last 90 days

    Frontend uses this data to draw line/bar charts.
    """
    user = get_current_user()
    if not user:
        return jsonify({"error": "User not found"}), 404

    try:
        days = int(request.args.get("days", 30))
        if days < 1 or days > 365:
            return jsonify({
                "error": "days must be between 1 and 365"
            }), 400
    except ValueError:
        return jsonify({"error": "days must be a number"}), 400

    history_data = get_usage_history(user.id, days)

    peak_storage = max((d["storage_used_mb"] for d in history_data), default=0)
    peak_api     = max((d["api_calls"]        for d in history_data), default=0)
    total_api    = sum(d["api_calls"]          for d in history_data)

    return jsonify({
        "username":       user.username,
        "days_requested": days,
        "peak_storage_mb": peak_storage,
        "peak_api_calls":  peak_api,
        "total_api_calls": total_api,
        "history":         history_data
    }), 200


# MONTHLY SUMMARY
@usage_bp.route("/api/usage/monthly", methods=["GET"])
@jwt_required()
def monthly():
    """
    Returns usage summary for a specific month.

    ?year=2026&month=2  → February 2026
    No params           → current month

    The billing engine on Day 8 reads from this same data.
    """
    user = get_current_user()
    if not user:
        return jsonify({"error": "User not found"}), 404

    today = date.today()

    try:
        year  = int(request.args.get("year",  today.year))
        month = int(request.args.get("month", today.month))

        if month < 1 or month > 12:
            return jsonify({"error": "month must be between 1 and 12"}), 400

        if year < 2024 or year > 2030:
            return jsonify({"error": "year out of range"}), 400

    except ValueError:
        return jsonify({"error": "year and month must be numbers"}), 400

    summary = get_monthly_summary(user.id, year, month)

    return jsonify({
        "username": user.username,
        "summary":  summary
    }), 200


# CURRENT MONTH — shortcut
@usage_bp.route("/api/usage/current-month", methods=["GET"])
@jwt_required()
def current_month():
    """
    Shortcut for current month summary.
    Frontend calls this to show 'this month so far' on the billing page.
    """
    user = get_current_user()
    if not user:
        return jsonify({"error": "User not found"}), 404

    summary = get_current_month_summary(user.id)

    return jsonify({
        "username": user.username,
        "summary":  summary
    }), 200


# ALL TIME stats
@usage_bp.route("/api/usage/alltime", methods=["GET"])
@jwt_required()
def alltime():
    """
    Returns lifetime stats for the user.
    Shown on the profile/account page.
    """
    user = get_current_user()
    if not user:
        return jsonify({"error": "User not found"}), 404

    stats = get_alltime_stats(user.id)

    return jsonify({
        "username": user.username,
        "stats":    stats
    }), 200

# ANOMALY DETECTION
@usage_bp.route("/api/usage/anomaly", methods=["GET"])
@jwt_required()
def anomaly():
    user = get_current_user()
    if not user:
        return jsonify({"error": "User not found"}), 404
        
    result = score_today_anomaly(user.id)
    return jsonify(result), 200