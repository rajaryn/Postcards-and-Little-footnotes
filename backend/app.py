import logging
import os
from pathlib import Path
from datetime import date, datetime
from flask import Flask, jsonify, send_from_directory
from flask.json.provider import DefaultJSONProvider
from flask_cors import CORS

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)

from config import Config
import db
from db import DatabaseError
from routes.auth import auth_bp
from routes.trips import trips_bp
from routes.moments import moments_bp
from routes.uploads import uploads_bp

BASE_DIR = Path(__file__).resolve().parent
FRONTEND_DIR = BASE_DIR.parent / "frontend"


class CustomJSONProvider(DefaultJSONProvider):
    """Serialize datetime and date objects without misleading GMT offsets."""

    def default(self, obj):
        if isinstance(obj, datetime):
            return obj.strftime("%Y-%m-%d %H:%M:%S")
        if isinstance(obj, date):
            return obj.strftime("%Y-%m-%d")
        return super().default(obj)


def create_app(test_config=None):
    """Application factory for Postcards & Little Footnotes."""
    app = Flask(
        __name__,
        static_folder=str(FRONTEND_DIR),
        static_url_path="",
    )

    app.json = CustomJSONProvider(app)

    app.config.from_object(Config)
    if test_config:
        app.config.update(test_config)

    # Enable CORS for API routes
    CORS(app, resources={r"/api/*": {"origins": "*"}, r"/uploads/*": {"origins": "*"}})

    # Teardown database connection
    app.teardown_appcontext(lambda e=None: db.close_db(e))

    # Register API Blueprints
    app.register_blueprint(auth_bp)
    app.register_blueprint(trips_bp)
    app.register_blueprint(moments_bp)
    app.register_blueprint(uploads_bp)

    # Initialize DB tables
    with app.app_context():
        try:
            db.init_db(app)
        except Exception as e:
            app.logger.error(f"Error during database initialization: {e}")

    # Health check / cron keep-alive endpoint for Render & scheduled pingers
    @app.route("/api/health", methods=["GET", "HEAD"])
    @app.route("/api/ping", methods=["GET", "HEAD"])
    @app.route("/health", methods=["GET", "HEAD"])
    @app.route("/ping", methods=["GET", "HEAD"])
    def health_check():
        return jsonify({
            "status": "ok",
            "message": "Server is awake and healthy",
            "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        }), 200

    # Serve uploaded images for local fallback mode
    @app.route("/uploads/<path:filename>")
    def serve_upload(filename):
        return send_from_directory(str(Config.LOCAL_UPLOADS_FOLDER), filename)

    # Serve frontend SPA / PWA routes
    @app.route("/")
    def index():
        if FRONTEND_DIR.exists():
            return send_from_directory(str(FRONTEND_DIR), "index.html")
        return jsonify({"message": "Postcards & Little Footnotes Backend API is running."})

    @app.route("/<path:path>")
    def serve_static(path):
        if FRONTEND_DIR.exists() and (FRONTEND_DIR / path).exists():
            return send_from_directory(str(FRONTEND_DIR), path)
        if FRONTEND_DIR.exists() and (FRONTEND_DIR / "index.html").exists():
            return send_from_directory(str(FRONTEND_DIR), "index.html")
        return jsonify({"error": "Not found"}), 404

    # Disable aggressive client caching during active development
    @app.after_request
    def set_cache_headers(response):
        if "Cache-Control" not in response.headers:
            response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
            response.headers["Pragma"] = "no-cache"
            response.headers["Expires"] = "0"
        return response

    # Friendly error handlers
    @app.errorhandler(DatabaseError)
    def handle_database_error(error):
        return jsonify({"error": error.message}), error.status_code

    @app.errorhandler(413)
    def request_entity_too_large(error):
        return jsonify({"error": "Photo file is too large. Maximum allowed size is 16MB."}), 413

    @app.errorhandler(404)
    def not_found(error):
        return jsonify({"error": "Resource not found."}), 404

    @app.errorhandler(500)
    def internal_error(error):
        return jsonify({"error": "Something went wrong on the server. Please try again."}), 500

    return app


app = create_app()

if __name__ == "__main__":
    app.run(
        host="0.0.0.0",
        port=Config.PORT,
        debug=Config.DEBUG,
    )
