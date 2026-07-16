from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import User
from services.ai_agent_service import get_billing_answer

ai_bp = Blueprint("ai", __name__)

def get_current_user():
    user_id = get_jwt_identity()
    return User.query.get(int(user_id))

@ai_bp.route("/api/ai/chat", methods=["POST"])
@jwt_required()
def chat():
    user = get_current_user()
    if not user:
        return jsonify({"error": "User not found"}), 404

    data = request.get_json() or {}
    message = data.get("message")
    
    if not message:
        return jsonify({"error": "Message is required"}), 400
        
    answer = get_billing_answer(user.id, message)
    
    return jsonify({
        "username": user.username,
        "answer": answer
    }), 200
