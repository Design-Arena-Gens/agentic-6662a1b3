from flask import Flask, jsonify
from flask_migrate import Migrate

from backend.config import config
from backend.extensions import db, init_extensions
from backend.routes import (
    analytics_bp,
    attendance_bp,
    auth_bp,
    chatbot_bp,
    diet_bp,
    posture_bp,
)


def create_app() -> Flask:
    app = Flask(__name__, static_folder=None)
    app.config.from_object(config)

    mongo_client = init_extensions(app)
    Migrate(app, db)

    app.register_blueprint(auth_bp)
    app.register_blueprint(attendance_bp)
    app.register_blueprint(analytics_bp)
    app.register_blueprint(diet_bp)
    app.register_blueprint(posture_bp)
    app.register_blueprint(chatbot_bp)

    @app.get("/health")
    def health_check():
        mysql_ok = True
        mongo_ok = True
        try:
            db.session.execute("SELECT 1")
        except Exception:  # pragma: no cover - defensive
            mysql_ok = False
        try:
            mongo_client.admin.command("ping")
        except Exception:  # pragma: no cover - defensive
            mongo_ok = False

        status = mysql_ok and mongo_ok
        code = 200 if status else 503
        return (
            jsonify({"status": "ok" if status else "degraded", "mysql": mysql_ok, "mongo": mongo_ok}),
            code,
        )

    return app


app = create_app()


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
