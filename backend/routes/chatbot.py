from http import HTTPStatus

from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required


chatbot_bp = Blueprint("chatbot", __name__, url_prefix="/api/chatbot")

_RESPONSES = {
    "macros": "To balance macros, aim for 30% protein, 45% carbs, and 25% fats for active individuals.",
    "diet": "For Indian diets, focus on whole grains like millets, lean proteins such as dal or chicken, and seasonal veggies.",
    "workout": "Remember to warm up 5 minutes before workouts and hydrate regularly.",
    "situp": "Keep your feet flat, engage core, avoid pulling your neck, and breathe out on the way up.",
    "hand raise": "Stand tall, engage shoulders, and raise arms symmetrically to maintain balance.",
}


def _generate_response(prompt: str) -> str:
    lower_prompt = prompt.lower()
    for keyword, message in _RESPONSES.items():
        if keyword in lower_prompt:
            return message
    return (
        "I'm here 24x7! Ask me about macros, Indian diet tips, fitness guidance, or workout basics."
    )


@chatbot_bp.post("/ask")
@jwt_required(optional=True)
def ask():
    data = request.get_json() or {}
    prompt = data.get("prompt", "")
    if not prompt:
        return jsonify({"message": "Prompt required"}), HTTPStatus.BAD_REQUEST
    answer = _generate_response(prompt)
    return jsonify({"answer": answer}), HTTPStatus.OK
