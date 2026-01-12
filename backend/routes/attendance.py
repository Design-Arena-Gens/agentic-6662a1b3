import base64
import io
import secrets
from datetime import datetime
from http import HTTPStatus

import qrcode
from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required

from backend.extensions import db
from backend.models import AttendanceLog, User


attendance_bp = Blueprint("attendance", __name__, url_prefix="/api/attendance")


@attendance_bp.post("/generate-qr")
@jwt_required()
def generate_qr():
    data = request.get_json() or {}
    user_id = data.get("user_id")
    check_type = data.get("check_type", "checkin")

    if check_type not in {"checkin", "checkout"}:
        return jsonify({"message": "Unsupported check type"}), HTTPStatus.BAD_REQUEST

    user = User.query.get(user_id)
    if not user:
        return jsonify({"message": "User not found"}), HTTPStatus.NOT_FOUND

    token = secrets.token_hex(16)
    payload = {
        "user_id": user_id,
        "check_type": check_type,
        "token": token,
        "issued_at": datetime.utcnow().isoformat(),
    }

    qr = qrcode.QRCode(box_size=8, border=2)
    qr.add_data(payload)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    encoded = base64.b64encode(buffer.getvalue()).decode("utf-8")

    return jsonify({"qr_image": encoded, "payload": payload}), HTTPStatus.OK


@attendance_bp.post("/log")
@jwt_required()
def log_attendance():
    data = request.get_json() or {}
    user_id = data.get("user_id")
    check_type = data.get("check_type")
    token = data.get("token")

    if not all([user_id, check_type, token]):
        return jsonify({"message": "Incomplete payload"}), HTTPStatus.BAD_REQUEST

    log = AttendanceLog(user_id=user_id, check_type=check_type, qr_token=token)
    db.session.add(log)
    db.session.commit()

    return jsonify({"message": "Attendance recorded", "log": log.to_dict()}), HTTPStatus.CREATED


@attendance_bp.get("/history/<int:user_id>")
@jwt_required()
def attendance_history(user_id: int):
    logs = (
        AttendanceLog.query.filter_by(user_id=user_id)
        .order_by(AttendanceLog.timestamp.desc())
        .all()
    )
    return jsonify([log.to_dict() for log in logs]), HTTPStatus.OK
