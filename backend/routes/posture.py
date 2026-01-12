from datetime import datetime
from http import HTTPStatus

from flask import Blueprint, current_app, jsonify, request
from flask_jwt_extended import jwt_required


posture_bp = Blueprint("posture", __name__, url_prefix="/api/posture")


@posture_bp.post("/session")
@jwt_required()
def log_session():
    payload = request.get_json() or {}
    user_id = payload.get("user_id")
    exercise = payload.get("exercise")
    frames = payload.get("frames", [])
    average_completion = payload.get("average_completion", 0)

    if not all([user_id, exercise]):
        return jsonify({"message": "user_id and exercise required"}), HTTPStatus.BAD_REQUEST

    doc = {
        "user_id": user_id,
        "exercise": exercise,
        "frames": frames,
        "average_completion": average_completion,
        "timestamp": datetime.utcnow().isoformat(),
    }
    result = current_app.mongo_db.posture_sessions.insert_one(doc)
    return jsonify({"message": "Session stored", "id": str(result.inserted_id)}), HTTPStatus.CREATED


@posture_bp.get("/history/<int:user_id>")
@jwt_required()
def history(user_id: int):
    docs = list(
        current_app.mongo_db.posture_sessions.find({"user_id": user_id}).sort("timestamp", -1)
    )
    for doc in docs:
        doc["id"] = str(doc.pop("_id"))
    return jsonify(docs), HTTPStatus.OK
