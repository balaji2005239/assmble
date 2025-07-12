from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity, create_refresh_token
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime, timezone
import pytz
import re
import logging
from database import Session, User, Skill, Role, PortfolioItem, ActivityLog

auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')
logger = logging.getLogger(__name__)

# Set Indian timezone
IST = pytz.timezone('Asia/Kolkata')

def validate_email(email):
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(pattern, email) is not None

def validate_password(password):
    return len(password) >= 6

@auth_bp.route('/register', methods=['POST'])
def register():
    session = Session()
    try:
        logger.info("Registration attempt started")
        data = request.get_json()
        
        if not data:
            logger.error("No JSON data provided in registration request")
            return jsonify({"error": "No data provided"}), 400
        
        # Validate required fields
        username = data.get('username', '').strip()
        email = data.get('email', '').strip().lower()
        password = data.get('password', '')
        full_name = data.get('full_name', '').strip()
        
        logger.info(f"Registration attempt for username: {username}, email: {email}")
        
        if not username or not email or not password:
            logger.error("Missing required fields in registration")
            return jsonify({"error": "Username, email, and password are required"}), 400
        
        if not validate_email(email):
            logger.error(f"Invalid email format: {email}")
            return jsonify({"error": "Invalid email format"}), 400
        
        if not validate_password(password):
            logger.error("Password too short")
            return jsonify({"error": "Password must be at least 6 characters long"}), 400
        
        # Check if user already exists
        existing_username = session.query(User).filter_by(username=username).first()
        if existing_username:
            logger.error(f"Username already exists: {username}")
            return jsonify({"error": "Username already exists"}), 409
        
        existing_email = session.query(User).filter_by(email=email).first()
        if existing_email:
            logger.error(f"Email already exists: {email}")
            return jsonify({"error": "Email already exists"}), 409
        
        # Create new user
        hashed_password = generate_password_hash(password)
        new_user = User(
            username=username,
            email=email,
            password=hashed_password,
            full_name=full_name or username,
            created_at=datetime.now(IST)
        )
        
        session.add(new_user)
        session.commit()
        
        logger.info(f"User created successfully: {username} (ID: {new_user.id})")
        
        # Create tokens
        access_token = create_access_token(identity=new_user.username)
        refresh_token = create_refresh_token(identity=new_user.username)
        
        logger.info(f"Tokens created for user: {username}")
        
        return jsonify({
            "message": "User registered successfully",
            "access_token": access_token,
            "refresh_token": refresh_token,
            "user": {
                "id": new_user.id,
                "username": new_user.username,
                "email": new_user.email,
                "full_name": new_user.full_name,
                "avatar_url": new_user.avatar_url
            }
        }), 201
        
    except Exception as e:
        session.rollback()
        logger.error(f"Registration failed: {type(e).__name__}: {str(e)}")
        logger.error(f"Registration data: {data if 'data' in locals() else 'No data'}")
        return jsonify({"error": "Registration failed", "details": str(e)}), 500
    finally:
        session.close()

@auth_bp.route('/login', methods=['POST'])
def login():
    session = Session()
    try:
        logger.info("Login attempt started")
        data = request.get_json()
        
        if not data:
            logger.error("No JSON data provided in login request")
            return jsonify({"error": "No data provided"}), 400
        
        username = data.get('username', '').strip()
        password = data.get('password', '')
        
        logger.info(f"Login attempt for: {username}")
        
        if not username or not password:
            logger.error("Missing username or password")
            return jsonify({"error": "Username and password are required"}), 400
        
        # Find user by username or email
        user = session.query(User).filter(
            (User.username == username) | (User.email == username)
        ).first()
        
        if not user:
            logger.error(f"User not found: {username}")
            return jsonify({"error": "Invalid credentials"}), 401
        
        if not check_password_hash(user.password, password):
            logger.error(f"Invalid password for user: {username}")
            return jsonify({"error": "Invalid credentials"}), 401
        
        if not user.is_active:
            logger.error(f"Inactive account login attempt: {username}")
            return jsonify({"error": "Account is disabled"}), 401
        
        # Update last login
        user.last_login = datetime.now(IST)
        session.commit()
        
        logger.info(f"User logged in successfully: {username} (ID: {user.id})")
        
        # Create tokens
        access_token = create_access_token(identity=user.username)
        refresh_token = create_refresh_token(identity=user.username)
        
        return jsonify({
            "message": "Login successful",
            "access_token": access_token,
            "refresh_token": refresh_token,
            "user": {
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "full_name": user.full_name,
                "avatar_url": user.avatar_url,
                "bio": user.bio,
                "location": user.location,
                "experience": user.experience
            }
        }), 200
        
    except Exception as e:
        logger.error(f"Login failed: {type(e).__name__}: {str(e)}")
        logger.error(f"Login data: {data if 'data' in locals() else 'No data'}")
        return jsonify({"error": "Login failed", "details": str(e)}), 500
    finally:
        session.close()

@auth_bp.route('/refresh', methods=['POST'])
@jwt_required(refresh=True)
def refresh():
    try:
        current_user = get_jwt_identity()
        logger.info(f"Token refresh for user: {current_user}")
        access_token = create_access_token(identity=current_user)
        return jsonify({"access_token": access_token}), 200
    except Exception as e:
        logger.error(f"Token refresh failed: {type(e).__name__}: {str(e)}")
        return jsonify({"error": "Token refresh failed", "details": str(e)}), 500

@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def get_profile():
    session = Session()
    try:
        current_user_id = get_jwt_identity()
        logger.info(f"Profile request for user: {current_user_id}")
        
        user = session.query(User).filter_by(username=current_user_id).first()
        
        if not user:
            logger.error(f"User not found in profile request: {current_user_id}")
            return jsonify({"error": "User not found"}), 404
        
        # Get user stats
        project_count = len(user.projects)
        skills_count = len(user.skills)
        
        logger.info(f"Profile data retrieved for user: {current_user_id}")
        
        return jsonify({
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "full_name": user.full_name,
            "bio": user.bio,
            "location": user.location,
            "experience": user.experience,
            "github_url": user.github_url,
            "linkedin_url": user.linkedin_url,
            "twitter_url": user.twitter_url,
            "portfolio_url": user.portfolio_url,
            "preferred_contact": user.preferred_contact,
            "availability": user.availability,
            "open_to_opportunities": user.open_to_opportunities,
            "avatar_url": user.avatar_url,
            "is_active": user.is_active,
            "project_count": project_count,
            "skills_count": skills_count,
            "created_at": user.created_at.astimezone(IST).isoformat(),
            "skills": [{"id": skill.id, "name": skill.name, "category": skill.category} for skill in user.skills],
            "roles": [{"id": role.id, "name": role.name, "description": role.description, "category": role.category} for role in user.roles]
        }), 200
        
    except Exception as e:
        logger.error(f"Failed to fetch profile: {type(e).__name__}: {str(e)}")
        return jsonify({"error": "Failed to fetch profile", "details": str(e)}), 500
    finally:
        session.close()

@auth_bp.route('/me', methods=['PUT'])
@jwt_required()
def update_profile():
    session = Session()
    try:
        current_user_id = get_jwt_identity()
        logger.info(f"Profile update request for user: {current_user_id}")
        
        user = session.query(User).filter_by(username=current_user_id).first()
        
        if not user:
            logger.error(f"User not found in profile update: {current_user_id}")
            return jsonify({"error": "User not found"}), 404
        
        data = request.get_json()
        if not data:
            logger.error("No data provided for profile update")
            return jsonify({"error": "No data provided"}), 400
        
        # Update fields
        if 'full_name' in data:
            user.full_name = data['full_name'].strip()
        if 'bio' in data:
            user.bio = data['bio'].strip()
        if 'location' in data:
            user.location = data['location'].strip()
        if 'experience' in data:
            user.experience = data['experience'].strip()
        if 'github_url' in data:
            user.github_url = data['github_url'].strip()
        if 'linkedin_url' in data:
            user.linkedin_url = data['linkedin_url'].strip()
        if 'twitter_url' in data:
            user.twitter_url = data['twitter_url'].strip()
        if 'portfolio_url' in data:
            user.portfolio_url = data['portfolio_url'].strip()
        if 'preferred_contact' in data:
            user.preferred_contact = data['preferred_contact']
        if 'availability' in data:
            user.availability = data['availability']
        if 'open_to_opportunities' in data:
            user.open_to_opportunities = data['open_to_opportunities']
        
        # Update skills
        if 'skill_ids' in data:
            skill_ids = data['skill_ids']
            skills = session.query(Skill).filter(Skill.id.in_(skill_ids)).all()
            user.skills = skills
            logger.info(f"Updated skills for user {current_user_id}: {len(skills)} skills")
        
        # Update roles
        if 'role_ids' in data:
            role_ids = data['role_ids']
            roles = session.query(Role).filter(Role.id.in_(role_ids)).all()
            user.roles = roles
            logger.info(f"Updated roles for user {current_user_id}: {len(roles)} roles")
        
        user.updated_at = datetime.now(IST)
        session.commit()
        
        logger.info(f"Profile updated successfully for user: {current_user_id}")
        
        return jsonify({"message": "Profile updated successfully"}), 200
        
    except Exception as e:
        session.rollback()
        logger.error(f"Failed to update profile: {type(e).__name__}: {str(e)}")
        return jsonify({"error": "Failed to update profile", "details": str(e)}), 500
    finally:
        session.close()

@auth_bp.route('/skills', methods=['GET'])
@jwt_required()
def get_skills():
    session = Session()
    try:
        logger.info("Skills request")
        skills = session.query(Skill).order_by(Skill.category, Skill.name).all()
        
        skills_data = []
        for skill in skills:
            skills_data.append({
                "id": skill.id,
                "name": skill.name,
                "category": skill.category
            })
        
        logger.info(f"Retrieved {len(skills_data)} skills")
        return jsonify(skills_data), 200
        
    except Exception as e:
        logger.error(f"Failed to fetch skills: {type(e).__name__}: {str(e)}")
        return jsonify({"error": "Failed to fetch skills", "details": str(e)}), 500
    finally:
        session.close()

@auth_bp.route('/roles', methods=['GET'])
@jwt_required()
def get_roles():
    session = Session()
    try:
        logger.info("Roles request")
        roles = session.query(Role).order_by(Role.category, Role.name).all()
        
        roles_data = []
        for role in roles:
            roles_data.append({
                "id": role.id,
                "name": role.name,
                "description": role.description,
                "category": role.category
            })
        
        logger.info(f"Retrieved {len(roles_data)} roles")
        return jsonify(roles_data), 200
        
    except Exception as e:
        logger.error(f"Failed to fetch roles: {type(e).__name__}: {str(e)}")
        return jsonify({"error": "Failed to fetch roles", "details": str(e)}), 500
    finally:
        session.close()

@auth_bp.route('/users/<int:user_id>', methods=['GET'])
@jwt_required()
def get_user_profile(user_id):
    session = Session()
    try:
        logger.info(f"User profile request for ID: {user_id}")
        user = session.query(User).filter_by(id=user_id).first()
        
        if not user:
            logger.error(f"User not found: {user_id}")
            return jsonify({"error": "User not found"}), 404
        
        # Get user stats
        project_count = len(user.projects)
        skills_count = len(user.skills)
        
        logger.info(f"User profile retrieved: {user.username}")
        
        return jsonify({
            "id": user.id,
            "username": user.username,
            "full_name": user.full_name,
            "bio": user.bio,
            "location": user.location,
            "experience": user.experience,
            "github_url": user.github_url,
            "linkedin_url": user.linkedin_url,
            "twitter_url": user.twitter_url,
            "portfolio_url": user.portfolio_url,
            "preferred_contact": user.preferred_contact,
            "availability": user.availability,
            "open_to_opportunities": user.open_to_opportunities,
            "avatar_url": user.avatar_url,
            "project_count": project_count,
            "skills_count": skills_count,
            "created_at": user.created_at.astimezone(IST).isoformat(),
            "skills": [{"id": skill.id, "name": skill.name, "category": skill.category} for skill in user.skills],
            "roles": [{"id": role.id, "name": role.name, "description": role.description, "category": role.category} for role in user.roles]
        }), 200
        
    except Exception as e:
        logger.error(f"Failed to fetch user profile: {type(e).__name__}: {str(e)}")
        return jsonify({"error": "Failed to fetch user profile", "details": str(e)}), 500
    finally:
        session.close()

@auth_bp.route('/portfolio', methods=['GET'])
@jwt_required()
def get_portfolio():
    session = Session()
    try:
        current_user_id = get_jwt_identity()
        user = session.query(User).filter_by(username=current_user_id).first()
        
        if not user:
            return jsonify({"error": "User not found"}), 404
        
        portfolio_items = session.query(PortfolioItem).filter_by(user_id=user.id).order_by(PortfolioItem.created_at.desc()).all()
        
        items_data = []
        for item in portfolio_items:
            items_data.append({
                "id": item.id,
                "title": item.title,
                "description": item.description,
                "image_url": item.image_url,
                "project_url": item.project_url,
                "github_url": item.github_url,
                "technologies": item.technologies,
                "created_at": item.created_at.isoformat()
            })
        
        return jsonify(items_data), 200
        
    except Exception as e:
        logger.error(f"Failed to fetch portfolio: {type(e).__name__}: {str(e)}")
        return jsonify({"error": "Failed to fetch portfolio"}), 500
    finally:
        session.close()

@auth_bp.route('/portfolio', methods=['POST'])
@jwt_required()
def add_portfolio_item():
    session = Session()
    try:
        current_user_id = get_jwt_identity()
        user = session.query(User).filter_by(username=current_user_id).first()
        
        if not user:
            return jsonify({"error": "User not found"}), 404
        
        data = request.get_json()
        
        if not data.get('title', '').strip():
            return jsonify({"error": "Title is required"}), 400
        
        portfolio_item = PortfolioItem(
            user_id=user.id,
            title=data.get('title', '').strip(),
            description=data.get('description', '').strip(),
            image_url=data.get('image_url', '').strip(),
            project_url=data.get('project_url', '').strip(),
            github_url=data.get('github_url', '').strip(),
            technologies=data.get('technologies', '')
        )
        
        session.add(portfolio_item)
        session.commit()
        
        return jsonify({"message": "Portfolio item added successfully", "id": portfolio_item.id}), 201
        
    except Exception as e:
        session.rollback()
        logger.error(f"Failed to add portfolio item: {type(e).__name__}: {str(e)}")
        return jsonify({"error": "Failed to add portfolio item"}), 500
    finally:
        session.close()

@auth_bp.route('/portfolio/<int:item_id>', methods=['DELETE'])
@jwt_required()
def delete_portfolio_item(item_id):
    session = Session()
    try:
        current_user_id = get_jwt_identity()
        user = session.query(User).filter_by(username=current_user_id).first()
        
        if not user:
            return jsonify({"error": "User not found"}), 404
        
        portfolio_item = session.query(PortfolioItem).filter_by(id=item_id, user_id=user.id).first()
        
        if not portfolio_item:
            return jsonify({"error": "Portfolio item not found"}), 404
        
        session.delete(portfolio_item)
        session.commit()
        
        return jsonify({"message": "Portfolio item deleted successfully"}), 200
        
    except Exception as e:
        session.rollback()
        logger.error(f"Failed to delete portfolio item: {type(e).__name__}: {str(e)}")
        return jsonify({"error": "Failed to delete portfolio item"}), 500
    finally:
        session.close()

@auth_bp.route('/activity', methods=['GET'])
@jwt_required()
def get_activity():
    session = Session()
    try:
        current_user_id = get_jwt_identity()
        user = session.query(User).filter_by(username=current_user_id).first()
        
        if not user:
            return jsonify({"error": "User not found"}), 404
        
        activities = session.query(ActivityLog).filter_by(user_id=user.id).order_by(ActivityLog.created_at.desc()).limit(20).all()
        
        activities_data = []
        for activity in activities:
            activities_data.append({
                "id": activity.id,
                "action_type": activity.action_type,
                "action_description": activity.action_description,
                "related_id": activity.related_id,
                "created_at": activity.created_at.isoformat()
            })
        
        return jsonify(activities_data), 200
        
    except Exception as e:
        logger.error(f"Failed to fetch activity: {type(e).__name__}: {str(e)}")
        return jsonify({"error": "Failed to fetch activity"}), 500
    finally:
        session.close()

@auth_bp.route('/users/<int:user_id>/portfolio', methods=['GET'])
@jwt_required()
def get_user_portfolio(user_id):
    session = Session()
    try:
        portfolio_items = session.query(PortfolioItem).filter_by(user_id=user_id).order_by(PortfolioItem.created_at.desc()).all()
        
        items_data = []
        for item in portfolio_items:
            items_data.append({
                "id": item.id,
                "title": item.title,
                "description": item.description,
                "image_url": item.image_url,
                "project_url": item.project_url,
                "github_url": item.github_url,
                "technologies": item.technologies,
                "created_at": item.created_at.isoformat()
            })
        
        return jsonify(items_data), 200
        
    except Exception as e:
        logger.error(f"Failed to fetch user portfolio: {type(e).__name__}: {str(e)}")
        return jsonify({"error": "Failed to fetch portfolio"}), 500
    finally:
        session.close()