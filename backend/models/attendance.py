from datetime import datetime
from backend.extensions import db


class AttendanceLog(db.Model):
    __tablename__ = "attendance_logs"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    check_type = db.Column(db.String(10), nullable=False)  # checkin or checkout
    qr_token = db.Column(db.String(64), nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)

    user = db.relationship("User", back_populates="attendance_logs")

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "check_type": self.check_type,
            "qr_token": self.qr_token,
            "timestamp": self.timestamp.isoformat(),
        }
