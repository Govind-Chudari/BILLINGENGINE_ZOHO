from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import User

tasks_bp = Blueprint("tasks", __name__)


def require_admin():
    user_id = get_jwt_identity()
    user    = User.query.get(int(user_id))
    if not user:
        return None, (jsonify({"error": "User not found"}), 404)
    if user.role != "admin":
        return None, (jsonify({"error": "Admin access required"}), 403)
    return user, None


@tasks_bp.route("/api/tasks/generate-invoices", methods=["POST"])
@jwt_required()
def trigger_invoice_generation():
    admin, err = require_admin()
    if err: return err

    from tasks import generate_all_invoices
    task = generate_all_invoices.delay()

    return jsonify({
        "message": "Invoice generation task queued!",
        "task_id": task.id,
        "status":  "queued"
    }), 202


@tasks_bp.route("/api/tasks/storage-alerts", methods=["POST"])
@jwt_required()
def trigger_storage_alerts():
    admin, err = require_admin()
    if err: return err

    from tasks import send_storage_alerts
    task = send_storage_alerts.delay()

    return jsonify({
        "message": "Storage alert task queued!",
        "task_id": task.id,
        "status":  "queued"
    }), 202


@tasks_bp.route("/api/tasks/daily-digest", methods=["POST"])
@jwt_required()
def trigger_daily_digest():
    admin, err = require_admin()
    if err: return err

    from tasks import send_daily_digest
    task = send_daily_digest.delay()

    return jsonify({
        "message": "Daily digest task queued!",
        "task_id": task.id,
        "status":  "queued"
    }), 202


@tasks_bp.route("/api/tasks/status/<task_id>", methods=["GET"])
@jwt_required()
def task_status(task_id):
    admin, err = require_admin()
    if err: return err

    from celery_app import celery
    task = celery.AsyncResult(task_id)

    return jsonify({
        "task_id": task_id,
        "status":  task.status,
        "result":  task.result if task.status == "SUCCESS" else None
    }), 200