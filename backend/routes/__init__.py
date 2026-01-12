from .auth import auth_bp
from .attendance import attendance_bp
from .analytics import analytics_bp
from .diet import diet_bp
from .posture import posture_bp
from .chatbot import chatbot_bp

__all__ = [
    "auth_bp",
    "attendance_bp",
    "analytics_bp",
    "diet_bp",
    "posture_bp",
    "chatbot_bp",
]
