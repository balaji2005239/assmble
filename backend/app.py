import sys
import os
import logging
from datetime import datetime
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from flask import Flask, request, jsonify
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
from flask_cors import CORS
from flask_socketio import SocketIO
from datetime import timedelta
import os
from database import init_db, Session
from auth import auth_bp
from projects import projects_bp
from notifications import notifications_bp
from hackathons import hackathon_bp
from chat import chat_bp

app = Flask(
    __name__,
    static_folder="../dist",
    static_url_path="/"
)


# Configure logging
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('app.log'),
        logging.StreamHandler(sys.stdout)
    ]
)

logger = logging.getLogger(__name__)

# Configuration
app.config['JWT_SECRET_KEY'] = 'your-secret-key-change-in-production'
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=1)

# Initialize extensions
jwt = JWTManager(app)
CORS(app, supports_credentials=True)
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='threading')

# Initialize socketio in chat module
from chat import init_socketio
init_socketio(socketio)

# JWT Error Handlers
@jwt.expired_token_loader
def expired_token_callback(jwt_header, jwt_payload):
    logger.warning(f"Expired token accessed: {jwt_payload}")
    return jsonify({"error": "Token has expired", "code": "TOKEN_EXPIRED"}), 401

@jwt.invalid_token_loader
def invalid_token_callback(error):
    logger.warning(f"Invalid token: {error}")
    return jsonify({"error": "Invalid token", "code": "INVALID_TOKEN"}), 401

@jwt.unauthorized_loader
def missing_token_callback(error):
    logger.warning(f"Missing token: {error}")
    return jsonify({"error": "Authorization token is required", "code": "MISSING_TOKEN"}), 401

# Request logging middleware
@app.before_request
def log_request_info():
    logger.info(f"Request: {request.method} {request.url}")
    if request.is_json and request.get_json():
        # Don't log passwords
        data = request.get_json().copy()
        if 'password' in data:
            data['password'] = '[REDACTED]'
        logger.info(f"Request Body: {data}")

@app.after_request
def log_response_info(response):
    logger.info(f"Response: {response.status_code}")
    return response

# Initialize database with error handling
try:
    logger.info("Initializing database...")
    init_db()
    logger.info("Database initialized successfully")
except Exception as e:
    logger.error(f"Failed to initialize database: {str(e)}")
    logger.error(f"Error type: {type(e).__name__}")
    raise

# Register blueprints with error handling
try:
    logger.info("Registering blueprints...")
    app.register_blueprint(auth_bp)
    app.register_blueprint(projects_bp)
    app.register_blueprint(notifications_bp)
    app.register_blueprint(hackathon_bp)
    app.register_blueprint(chat_bp)
    logger.info("All blueprints registered successfully")
except Exception as e:
    logger.error(f"Failed to register blueprints: {str(e)}")
    raise

@app.route('/api/health', methods=['GET'])
def health_check():
    try:
        # Test database connection
        session = Session()
        session.execute('SELECT 1')
        session.close()
        
        logger.info("Health check passed")
        return jsonify({
            "status": "healthy", 
            "message": "API is running",
            "timestamp": datetime.now().isoformat(),
            "database": "connected"
        })
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        return jsonify({
            "status": "unhealthy",
            "message": "Database connection failed",
            "error": str(e)
        }), 500

@app.errorhandler(400)
def bad_request(error):
    logger.error(f"Bad Request (400): {error}")
    return jsonify({"error": "Bad request", "message": str(error)}), 400

@app.errorhandler(401)
def unauthorized(error):
    logger.error(f"Unauthorized (401): {error}")
    return jsonify({"error": "Unauthorized", "message": "Authentication required"}), 401

@app.errorhandler(403)
def forbidden(error):
    logger.error(f"Forbidden (403): {error}")
    return jsonify({"error": "Forbidden", "message": "Insufficient permissions"}), 403

@app.errorhandler(404)
def not_found(error):
    logger.error(f"Not Found (404): {request.url}")
    return jsonify({"error": "Endpoint not found", "url": request.url}), 404

@app.errorhandler(405)
def method_not_allowed(error):
    logger.error(f"Method Not Allowed (405): {request.method} {request.url}")
    return jsonify({"error": "Method not allowed", "method": request.method, "url": request.url}), 405

@app.errorhandler(500)
def internal_error(error):
    logger.error(f"Internal Server Error (500): {error}")
    logger.error(f"Error details: {str(error)}")
    return jsonify({
        "error": "Internal server error", 
        "message": "An unexpected error occurred",
        "timestamp": datetime.now().isoformat()
    }), 500

@app.errorhandler(Exception)
def handle_exception(e):
    logger.error(f"Unhandled Exception: {type(e).__name__}: {str(e)}")
    logger.error(f"Request: {request.method} {request.url}")
    
    # Return JSON instead of HTML for HTTP errors
    if hasattr(e, 'code'):
        return jsonify({
            "error": f"HTTP {e.code}",
            "message": str(e),
            "timestamp": datetime.now().isoformat()
        }), e.code
    
    return jsonify({
        "error": "Unexpected error",
        "message": str(e),
        "type": type(e).__name__,
        "timestamp": datetime.now().isoformat()
    }), 500

from flask import send_from_directory

@app.route("/", defaults={"path": ""})
@app.route("/<path:path>")
def serve_react(path):
    if path != "" and os.path.exists(os.path.join(app.static_folder, path)):
        return send_from_directory(app.static_folder, path)
    else:
        return send_from_directory(app.static_folder, "index.html")


if __name__ == '__main__':
    logger.info("Starting Flask application...")
    logger.info(f"Debug mode: {app.debug}")
    logger.info(f"Environment: {os.getenv('FLASK_ENV', 'development')}")
    
    try:
        socketio.run(app, debug=True, host='0.0.0.0', port=5000)
    except Exception as e:
        logger.error(f"Failed to start Flask application: {str(e)}")
        raise