from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager
from flask_cors import CORS
from pymongo import MongoClient


db = SQLAlchemy()
jwt = JWTManager()


def init_extensions(app):
    CORS(
        app,
        resources={r"/api/*": {"origins": app.config.get("FRONTEND_ORIGIN", "*")}},
        supports_credentials=True,
    )

    db.init_app(app)
    jwt.init_app(app)

    mongo_client = MongoClient(app.config["MONGO_URI"])
    app.mongo_db = mongo_client.get_default_database()

    return mongo_client
