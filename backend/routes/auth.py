from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from flask_bcrypt import Bcrypt
from models import db, User
from datetime import timedelta
from services.minio_service import create_user_bucket

auth_bp = Blueprint("auth", __name__)
bcrypt = Bcrypt()


# Register
@auth_bp.route("/api/register", methods=["POST"])
def register():
    data = request.get_json()

    if not data or not data.get("username") or not data.get("password") or not data.get("email"):
        return jsonify({"error": "username, email and password are required"}), 400

    username = data["username"]
    email    = data["email"]
    password = data["password"]

    if User.query.filter_by(username=username).first():
        return jsonify({"error": "Username already taken"}), 409

    if User.query.filter_by(email=email).first():
        return jsonify({"error": "Email already registered"}), 409

    hashed_password = bcrypt.generate_password_hash(password).decode("utf-8")
    new_user = User(username=username, email=email, password=hashed_password)

    db.session.add(new_user)
    db.session.commit()

    create_user_bucket(username)

    return jsonify({"message": f"User '{username}' registered successfully!"}), 201




# Login
@auth_bp.route("/api/login", methods=["POST"])
def login():
    data = request.get_json()

    if not data or not data.get("username") or not data.get("password"):
        return jsonify({"error": "username and password are required"}), 400

    username = data["username"]
    password = data["password"]

    user = User.query.filter_by(username=username).first()

    if not user or not bcrypt.check_password_hash(user.password, password):
        return jsonify({"error": "Invalid username or password"}), 401

    token = create_access_token(identity=str(user.id))

    return jsonify({
        "message": "Login successful!",
        "token": token,
        "username": user.username,
        "user_id": user.id,
        "role":     user.role,
    }), 200



# Profile
@auth_bp.route("/api/profile", methods=["GET"])
@jwt_required()
def profile():
    user_id = get_jwt_identity()
    user = User.query.get(int(user_id))
    if not user:
        return jsonify({"error": "User not found"}), 404
    return jsonify({
        "id":         user.id,
        "username":   user.username,
        "email":      user.email,
        "role":       user.role,          
        "created_at": user.created_at.isoformat()
    }), 200