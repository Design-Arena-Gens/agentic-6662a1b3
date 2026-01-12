import csv
import io
from collections import Counter, defaultdict
from datetime import datetime, timedelta
from http import HTTPStatus

from flask import Blueprint, current_app, jsonify, make_response
from flask_jwt_extended import jwt_required

from backend.extensions import db
from backend.models import AttendanceLog, User


analytics_bp = Blueprint("analytics", __name__, url_prefix="/api/analytics")


def _get_attendance_summary(days: int = 7):
    cutoff = datetime.utcnow() - timedelta(days=days)
    logs = (
        AttendanceLog.query.filter(AttendanceLog.timestamp >= cutoff)
        .order_by(AttendanceLog.timestamp.asc())
        .all()
    )
    daily = defaultdict(lambda: {"checkins": 0, "checkouts": 0})
    for log in logs:
        day_key = log.timestamp.strftime("%Y-%m-%d")
        if log.check_type == "checkin":
            daily[day_key]["checkins"] += 1
        else:
            daily[day_key]["checkouts"] += 1
    return {day: counts for day, counts in sorted(daily.items())}


def _get_posture_summary(mongo_db):
    sessions = list(mongo_db.posture_sessions.find().limit(1000))
    total_sessions = len(sessions)
    if not sessions:
        return {
            "total_sessions": 0,
            "avg_completion": 0,
            "exercise_breakdown": {},
            "accuracy_trend": [],
        }

    completion_sum = 0
    exercise_counter = Counter()
    trend = []
    for session in sessions:
        completion_sum += session.get("average_completion", 0)
        exercise_counter.update({session.get("exercise", "unknown"): 1})
        trend.append(
            {
                "timestamp": session.get("timestamp"),
                "completion": session.get("average_completion", 0),
            }
        )
    trend.sort(key=lambda x: x["timestamp"] or "")

    return {
        "total_sessions": total_sessions,
        "avg_completion": round(completion_sum / total_sessions, 2),
        "exercise_breakdown": dict(exercise_counter),
        "accuracy_trend": trend,
    }


@analytics_bp.get("/dashboard")
@jwt_required()
def dashboard():
    mongo_status = True
    try:
        current_app.mongo_db.command("ping")
    except Exception:  # pragma: no cover - defensive
        mongo_status = False

    mysql_status = True
    try:
        db.session.execute("SELECT 1")
    except Exception:  # pragma: no cover - defensive
        mysql_status = False

    user_count = User.query.count() if mysql_status else 0

    attendance_summary = _get_attendance_summary()
    posture_summary = _get_posture_summary(current_app.mongo_db)

    return (
        jsonify(
            {
                "database_status": {
                    "mysql_connected": mysql_status,
                    "mongo_connected": mongo_status,
                },
                "totals": {
                    "total_users": user_count,
                    "attendance_logs": sum(
                        v["checkins"] + v["checkouts"] for v in attendance_summary.values()
                    ),
                    "posture_sessions": posture_summary["total_sessions"],
                },
                "attendance_summary": attendance_summary,
                "posture_summary": posture_summary,
            }
        ),
        HTTPStatus.OK,
    )


@analytics_bp.get("/export/attendance")
@jwt_required()
def export_attendance():
    logs = AttendanceLog.query.order_by(AttendanceLog.timestamp.desc()).all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["ID", "User ID", "Type", "QRCode", "Timestamp"])
    for log in logs:
        writer.writerow(
            [
                log.id,
                log.user_id,
                log.check_type,
                log.qr_token,
                log.timestamp.isoformat(),
            ]
        )

    response = make_response(output.getvalue())
    response.headers["Content-Disposition"] = "attachment; filename=attendance.csv"
    response.headers["Content-Type"] = "text/csv"
    return response
