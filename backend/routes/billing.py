from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import User
from services.billing_service import (
    calculate_bill,
    generate_invoice,
    get_current_estimate,
    get_user_invoices,
    mark_invoice_paid
)
from services.blockchain import generate_invoice_hash
from services.prediction_service import predict_month_end_bill
from models import db
from datetime import date

billing_bp = Blueprint("billing", __name__)


def get_current_user():
    user_id = get_jwt_identity()
    return User.query.get(int(user_id))


# current month live preview
@billing_bp.route("/api/billing/estimate", methods=["GET"])
@jwt_required()
def estimate():
    """
    Live estimate of what this month's bill will be.
    Includes a forecast for the full month.
    Frontend shows this as 'Estimated Bill This Month'.
    """
    user = get_current_user()
    if not user:
        return jsonify({"error": "User not found"}), 404

    data = get_current_estimate(user.id)

    return jsonify({
        "username": user.username,
        "estimate": data
    }), 200


# CALCULATE — preview bill (month)
@billing_bp.route("/api/billing/calculate", methods=["GET"])
@jwt_required()
def calculate():
    """
    Calculates (but does NOT save) the bill for any month.
    Use this to preview before generating a real invoice.

    ?year=2026&month=2
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

    except ValueError:
        return jsonify({"error": "year and month must be valid numbers"}), 400

    bill = calculate_bill(user.id, year, month)

    return jsonify({
        "username": user.username,
        "bill":     bill
    }), 200


# create and save an invoice
@billing_bp.route("/api/billing/generate", methods=["POST"])
@jwt_required()
def generate():
    """
    Generates a real invoice and saves it to the database.
    Body: { "year": 2026, "month": 2 }

    If invoice already exists for that month, returns it without duplicating.
    """
    user = get_current_user()
    if not user:
        return jsonify({"error": "User not found"}), 404

    data  = request.get_json() or {}
    today = date.today()

    try:
        year  = int(data.get("year",  today.year))
        month = int(data.get("month", today.month))

        if month < 1 or month > 12:
            return jsonify({"error": "month must be between 1 and 12"}), 400

    except (ValueError, TypeError):
        return jsonify({"error": "year and month must be valid numbers"}), 400

    result      = generate_invoice(user.id, year, month)
    status_code = 200 if result["already_existed"] else 201

    return jsonify({
        "username": user.username,
        **result
    }), status_code


# LIST — all invoices 
@billing_bp.route("/api/billing/invoices", methods=["GET"])
@jwt_required()
def list_invoices():
    """
    Returns all saved invoices for the current user.
    Shows total amount spent across all months.
    """
    user = get_current_user()
    if not user:
        return jsonify({"error": "User not found"}), 404

    data = get_user_invoices(user.id)

    return jsonify({
        "username": user.username,
        **data
    }), 200


# GET single invoice by ID
@billing_bp.route("/api/billing/invoices/<int:invoice_id>", methods=["GET"])
@jwt_required()
def get_invoice(invoice_id):
    """
    Returns a single invoice.
    Users can only see their own invoices.
    """
    user = get_current_user()
    if not user:
        return jsonify({"error": "User not found"}), 404

    from models import Invoice
    invoice = Invoice.query.filter_by(
        id=invoice_id,
        user_id=user.id
    ).first()

    if not invoice:
        return jsonify({
            "error": f"Invoice #{invoice_id} not found",
            "hint":  "Use GET /api/billing/invoices to see your invoices"
        }), 404

    return jsonify({
        "username": user.username,
        "invoice":  invoice.to_dict()
    }), 200


# Mark invoice as paid
@billing_bp.route("/api/billing/invoices/<int:invoice_id>/pay", methods=["POST"])
@jwt_required()
def pay_invoice(invoice_id):
    """
    Marks an invoice as paid.
    In a real system this would integrate with Razorpay/Stripe.
    For now it just updates the status.
    """
    user = get_current_user()
    if not user:
        return jsonify({"error": "User not found"}), 404

    invoice, message = mark_invoice_paid(invoice_id, user.id)

    if not invoice:
        return jsonify({"error": message}), 404

    return jsonify({
        "message":  message,
        "invoice":  invoice.to_dict()
    }), 200


# Verify invoice on chain
@billing_bp.route("/api/billing/verify/<int:invoice_id>", methods=["GET"])
@jwt_required()
def verify_invoice(invoice_id):
    """
    Verifies the invoice hasn't been tampered with.
    Recomputes hash and compares it with stored hash.
    """
    user = get_current_user()
    if not user:
        return jsonify({"error": "User not found"}), 404

    from models import Invoice
    invoice = Invoice.query.filter_by(
        id=invoice_id,
        user_id=user.id
    ).first()

    if not invoice:
        return jsonify({"error": "Invoice not found"}), 404

    current_hash = generate_invoice_hash(invoice)
    
    # If the invoice hasn't been hashed yet (e.g. old invoice before this feature)
    if not invoice.invoice_hash:
        return jsonify({
            "error": "This invoice pre-dates the on-chain proof feature and cannot be verified."
        }), 400

    is_authentic = (current_hash == invoice.invoice_hash)

    explorer_url = None
    if invoice.chain_tx_hash:
        explorer_url = f"https://polygonscan.com/tx/{invoice.chain_tx_hash}"

    return jsonify({
        "invoice_id": invoice.id,
        "is_authentic": is_authentic,
        "current_hash": current_hash,
        "stored_hash": invoice.invoice_hash,
        "chain_tx_hash": invoice.chain_tx_hash,
        "explorer_url": explorer_url
    }), 200

# PREDICTION
@billing_bp.route("/api/billing/predict", methods=["GET"])
@jwt_required()
def predict_bill():
    user = get_current_user()
    if not user:
        return jsonify({"error": "User not found"}), 404
        
    result = predict_month_end_bill(user.id)
    return jsonify(result), 200

# SET BUDGET
@billing_bp.route("/api/billing/budget", methods=["POST"])
@jwt_required()
def set_budget():
    user = get_current_user()
    if not user:
        return jsonify({"error": "User not found"}), 404
        
    data = request.get_json() or {}
    budget = data.get("budget_limit")
    
    if budget is not None:
        try:
            user.budget_limit = float(budget)
            db.session.commit()
        except ValueError:
            return jsonify({"error": "budget_limit must be a number"}), 400
            
    return jsonify({"message": "Budget updated successfully", "budget_limit": user.budget_limit}), 200