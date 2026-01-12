from http import HTTPStatus
from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity

from backend.extensions import db
from backend.models import User
from backend.utils.security import hash_password, verify_password


auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")


@auth_bp.post("/register")
def register():
    data = request.get_json() or {}
    full_name = data.get("full_name")
    email = data.get("email")
    password = data.get("password")
    role = data.get("role", "member")

    if not all([full_name, email, password]):
        return jsonify({"message": "Missing required fields"}), HTTPStatus.BAD_REQUEST

    if User.query.filter_by(email=email).first():
        return jsonify({"message": "Email already registered"}), HTTPStatus.CONFLICT

    user = User(
        full_name=full_name,
        email=email,
        password_hash=hash_password(password),
        role=role,
        avatar_url=data.get("avatar_url"),
    )
    db.session.add(user)
    db.session.commit()

    return jsonify({"message": "Registration successful"}), HTTPStatus.CREATED


@auth_bp.post("/login")
def login():
    data = request.get_json() or {}
    email = data.get("email")
    password = data.get("password")

    if not all([email, password]):
        return jsonify({"message": "Email and password required"}), HTTPStatus.BAD_REQUEST

    user = User.query.filter_by(email=email).first()
    if not user or not verify_password(password, user.password_hash):
        return jsonify({"message": "Invalid credentials"}), HTTPStatus.UNAUTHORIZED

    token = create_access_token(identity=user.id)

    return jsonify({"access_token": token, "user": user.to_dict()}), HTTPStatus.OK


@auth_bp.get("/me")
@jwt_required()
def me():
    user_id = get_jwt_identity()
    user = User.query.get_or_404(user_id)
    return jsonify(user.to_dict()), HTTPStatus.OK
