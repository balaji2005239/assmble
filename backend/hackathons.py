from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime, timezone
import pytz
from database import Session, User, HackathonPost, HackathonApplication, Skill, Role, Notification, ActivityLog

hackathon_bp = Blueprint('hackathons', __name__, url_prefix='/api/hackathons')

# Set Indian timezone
IST = pytz.timezone('Asia/Kolkata')

@hackathon_bp.route('/', methods=['GET'], strict_slashes=False)
@jwt_required()
def get_hackathons():
    session = Session()
    try:
        # Get query parameters
        page = request.args.get('page', 1, type=int)
        per_page = min(request.args.get('per_page', 10, type=int), 100)
        search = request.args.get('search', '').strip()
        
        # Base query
        query = session.query(HackathonPost).filter(HackathonPost.is_active == True)
        
        # Apply search filter
        if search:
            query = query.filter(
                (HackathonPost.title.ilike(f'%{search}%')) |
                (HackathonPost.hackathon_name.ilike(f'%{search}%'))
            )
        
        # Get total count
        total = query.count()
        
        # Apply pagination
        offset = (page - 1) * per_page
        hackathons = query.order_by(HackathonPost.created_at.desc()).offset(offset).limit(per_page).all()
        
        # Get current user for checking applications
        current_user_id = get_jwt_identity()
        user = session.query(User).filter_by(username=current_user_id).first()
        
        # Serialize hackathons
        hackathons_data = []
        for hackathon in hackathons:
            # Check if current user has applied
            has_applied = session.query(HackathonApplication).filter_by(
                hackathon_id=hackathon.id,
                user_id=user.id if user else None
            ).first() is not None
            
            hackathons_data.append({
                "id": hackathon.id,
                "title": hackathon.title,
                "description": hackathon.description,
                "hackathon_name": hackathon.hackathon_name,
                "hackathon_date": hackathon.hackathon_date.astimezone(IST).isoformat() if hackathon.hackathon_date else None,
                "max_team_size": hackathon.max_team_size,
                "current_member_count": hackathon.current_member_count,
                "created_at": hackathon.created_at.astimezone(IST).isoformat(),
                "owner": {
                    "id": hackathon.owner.id,
                    "username": hackathon.owner.username,
                    "full_name": hackathon.owner.full_name,
                    "avatar_url": hackathon.owner.avatar_url
                },
                "skills": [{"id": skill.id, "name": skill.name, "category": skill.category} for skill in hackathon.skills],
                "roles": [{"id": role.id, "name": role.name, "description": role.description, "category": role.category} for role in hackathon.roles],
                "application_count": len(hackathon.applications),
                "has_applied": has_applied,
                "is_owner": hackathon.owner_id == (user.id if user else None)
            })
        
        return jsonify({
            "hackathons": hackathons_data,
            "pagination": {
                "page": page,
                "per_page": per_page,
                "total": total,
                "pages": (total + per_page - 1) // per_page
            }
        }), 200
        
    except Exception as e:
        return jsonify({"error": "Failed to fetch hackathons"}), 500
    finally:
        session.close()

@hackathon_bp.route('/<int:hackathon_id>', methods=['GET'])
@jwt_required()
def get_hackathon(hackathon_id):
    session = Session()
    try:
        hackathon = session.query(HackathonPost).filter_by(id=hackathon_id).first()
        
        if not hackathon:
            return jsonify({"error": "Hackathon not found"}), 404
        
        # Check if current user has applied
        current_user_id = get_jwt_identity()
        user = session.query(User).filter_by(username=current_user_id).first()
        has_applied = session.query(HackathonApplication).filter_by(
            hackathon_id=hackathon_id,
            user_id=user.id if user else None
        ).first() is not None
        
        hackathon_data = {
            "id": hackathon.id,
            "title": hackathon.title,
            "description": hackathon.description,
            "hackathon_name": hackathon.hackathon_name,
            "hackathon_date": hackathon.hackathon_date.astimezone(IST).isoformat() if hackathon.hackathon_date else None,
            "max_team_size": hackathon.max_team_size,
            "current_member_count": hackathon.current_member_count,
            "is_active": hackathon.is_active,
            "created_at": hackathon.created_at.astimezone(IST).isoformat(),
            "owner": {
                "id": hackathon.owner.id,
                "username": hackathon.owner.username,
                "full_name": hackathon.owner.full_name,
                "avatar_url": hackathon.owner.avatar_url,
                "bio": hackathon.owner.bio
            },
            "skills": [{"id": skill.id, "name": skill.name, "category": skill.category} for skill in hackathon.skills],
            "roles": [{"id": role.id, "name": role.name, "description": role.description, "category": role.category} for role in hackathon.roles],
            "application_count": len(hackathon.applications),
            "has_applied": has_applied,
            "is_owner": hackathon.owner_id == (user.id if user else None)
        }
        
        return jsonify(hackathon_data), 200
        
    except Exception as e:
        return jsonify({"error": "Failed to fetch hackathon"}), 500
    finally:
        session.close()

@hackathon_bp.route('/', methods=['POST'], strict_slashes=False)
@jwt_required()
def create_hackathon():
    session = Session()
    try:
        current_user_id = get_jwt_identity()
        user = session.query(User).filter_by(username=current_user_id).first()
        
        if not user:
            return jsonify({"error": "User not found"}), 404
        
        data = request.get_json()
        
        # Validate required fields
        title = data.get('title', '').strip()
        hackathon_name = data.get('hackathon_name', '').strip()
        
        if not title or not hackathon_name:
            return jsonify({"error": "Title and hackathon name are required"}), 400
        
        # Parse date if provided
        hackathon_date = None
        if data.get('hackathon_date'):
            try:
                # Parse the datetime and convert to IST
                hackathon_date = datetime.fromisoformat(data['hackathon_date'].replace('Z', '+00:00'))
                hackathon_date = hackathon_date.astimezone(IST)
            except ValueError:
                return jsonify({"error": "Invalid date format"}), 400
        
        # Parse max_team_size
        max_team_size = None
        if data.get('max_team_size'):
            try:
                max_team_size = int(data['max_team_size'])
                if max_team_size < 1:
                    return jsonify({"error": "Team size must be at least 1"}), 400
            except (ValueError, TypeError):
                return jsonify({"error": "Invalid team size"}), 400
        
        # Create hackathon
        hackathon = HackathonPost(
            title=title,
            description=data.get('description', '').strip(),
            hackathon_name=hackathon_name,
            hackathon_date=hackathon_date,
            max_team_size=max_team_size,
            owner_id=user.id
        )
        
        # Add skills
        skill_ids = data.get('skill_ids', [])
        if skill_ids:
            skills = session.query(Skill).filter(Skill.id.in_(skill_ids)).all()
            hackathon.skills = skills
        
        # Add roles
        role_ids = data.get('role_ids', [])
        if role_ids:
            roles = session.query(Role).filter(Role.id.in_(role_ids)).all()
            hackathon.roles = roles
        
        session.add(hackathon)
        session.commit()
        
        # Log activity
        activity = ActivityLog(
            user_id=user.id,
            action_type="created_hackathon",
            action_description=f"Created team search '{hackathon.title}' for {hackathon.hackathon_name}",
            related_id=hackathon.id
        )
        session.add(activity)
        session.commit()
        
        return jsonify({
            "message": "Team search created successfully!",
            "hackathon_id": hackathon.id
        }), 201
        
    except Exception as e:
        session.rollback()
        return jsonify({"error": "Failed to create team search"}), 500
    finally:
        session.close()

@hackathon_bp.route('/<int:hackathon_id>/applications', methods=['POST'])
@jwt_required()
def apply_to_hackathon(hackathon_id):
    session = Session()
    try:
        current_user_id = get_jwt_identity()
        user = session.query(User).filter_by(username=current_user_id).first()
        
        if not user:
            return jsonify({"error": "User not found"}), 404
        
        # Check if hackathon exists
        hackathon = session.query(HackathonPost).filter_by(id=hackathon_id, is_active=True).first()
        
        if not hackathon:
            return jsonify({"error": "Hackathon not found"}), 404
        
        # Check if user is hackathon owner
        if hackathon.owner_id == user.id:
            return jsonify({"error": "You cannot apply to your own team search"}), 400
        
        # Check if already applied
        existing_application = session.query(HackathonApplication).filter_by(
            hackathon_id=hackathon_id,
            user_id=user.id
        ).first()
        
        if existing_application:
            return jsonify({"error": "You have already applied to this team"}), 400
        
        # Check team size limit
        if hackathon.max_team_size and hackathon.current_member_count >= hackathon.max_team_size:
            return jsonify({"error": "Team is full"}), 400
        
        # Create application
        data = request.get_json()
        application = HackathonApplication(
            hackathon_id=hackathon_id,
            user_id=user.id,
            message=data.get('message', '').strip()
        )
        
        session.add(application)
        
        # Create notification for hackathon owner
        notification = Notification(
            user_id=hackathon.owner_id,
            title="New Team Application",
            content=f"{user.username} wants to join your team for '{hackathon.hackathon_name}'",
            type="info"
        )
        session.add(notification)
        
        session.commit()
        
        # Log activity
        activity = ActivityLog(
            user_id=user.id,
            action_type="applied_to_hackathon",
            action_description=f"Applied to join team for '{hackathon.hackathon_name}'",
            related_id=hackathon.id
        )
        session.add(activity)
        session.commit()
        
        return jsonify({"message": "Application submitted successfully"}), 201
        
    except Exception as e:
        session.rollback()
        return jsonify({"error": "Failed to submit application"}), 500
    finally:
        session.close()

@hackathon_bp.route('/<int:hackathon_id>/applications', methods=['GET'])
@jwt_required()
def get_hackathon_applications(hackathon_id):
    session = Session()
    try:
        current_user_id = get_jwt_identity()
        user = session.query(User).filter_by(username=current_user_id).first()
        
        if not user:
            return jsonify({"error": "User not found"}), 404
        
        # Check if user owns the hackathon
        hackathon = session.query(HackathonPost).filter_by(id=hackathon_id, owner_id=user.id).first()
        if not hackathon:
            return jsonify({"error": "Hackathon not found or not owned by you"}), 404
        
        applications = session.query(HackathonApplication).filter_by(hackathon_id=hackathon_id).order_by(HackathonApplication.applied_at.desc()).all()
        
        applications_data = []
        for app in applications:
            applications_data.append({
                "id": app.id,
                "message": app.message,
                "status": app.status,
                "applied_at": app.applied_at.astimezone(IST).isoformat(),
                "user": {
                    "id": app.user.id,
                    "username": app.user.username,
                    "full_name": app.user.full_name,
                    "avatar_url": app.user.avatar_url,
                    "bio": app.user.bio,
                    "location": app.user.location,
                    "experience": app.user.experience,
                    "skills": [{"id": skill.id, "name": skill.name, "category": skill.category} for skill in app.user.skills],
                    "roles": [{"id": role.id, "name": role.name, "description": role.description, "category": role.category} for role in app.user.roles]
                }
            })
        
        return jsonify(applications_data), 200
        
    except Exception as e:
        return jsonify({"error": "Failed to fetch applications"}), 500
    finally:
        session.close()

@hackathon_bp.route('/applications/<int:application_id>/status', methods=['PUT'])
@jwt_required()
def update_hackathon_application_status(application_id):
    session = Session()
    try:
        current_user_id = get_jwt_identity()
        user = session.query(User).filter_by(username=current_user_id).first()
        
        if not user:
            return jsonify({"error": "User not found"}), 404
        
        application = session.query(HackathonApplication).filter_by(id=application_id).first()
        if not application:
            return jsonify({"error": "Application not found"}), 404
        
        # Check if user owns the hackathon
        if application.hackathon.owner_id != user.id:
            return jsonify({"error": "Not authorized to update this application"}), 403
        
        data = request.get_json()
        new_status = data.get('status')
        
        if new_status not in ['accepted', 'rejected']:
            return jsonify({"error": "Invalid status"}), 400
        
        application.status = new_status
        
        # Create notification for applicant
        notification = Notification(
            user_id=application.user_id,
            title="Team Application Status Updated",
            content=f"Your application to join the team for '{application.hackathon.hackathon_name}' has been {new_status}",
            type="success" if new_status == "accepted" else "info"
        )
        session.add(notification)
        
        # Update team member count
        if new_status == 'accepted':
            application.hackathon.current_member_count += 1
        elif application.status == 'accepted' and new_status == 'rejected':
            application.hackathon.current_member_count = max(0, application.hackathon.current_member_count - 1)
        
        # Create notification for applicant
        notification = Notification(
            user_id=application.user_id,
            title="Team Application Status Updated",
            content=f"Your application to join the team for '{application.hackathon.hackathon_name}' has been {new_status}",
            type="success" if new_status == "accepted" else "info"
        )
        session.add(notification)
        
        session.commit()
        
        # Log activity for hackathon owner
        activity = ActivityLog(
            user_id=user.id,
            action_type="updated_hackathon_application",
            action_description=f"{'Accepted' if new_status == 'accepted' else 'Rejected'} team application for '{application.hackathon.hackathon_name}'",
            related_id=application.hackathon.id
        )
        session.add(activity)
        session.commit()
        
        return jsonify({"message": f"Application {new_status} successfully"}), 200
        
    except Exception as e:
        session.rollback()
        return jsonify({"error": "Failed to update application status"}), 500
    finally:
        session.close()

@hackathon_bp.route('/my', methods=['GET'])
@jwt_required()
def get_my_hackathons():
    session = Session()
    try:
        current_user_id = get_jwt_identity()
        user = session.query(User).filter_by(username=current_user_id).first()
        
        if not user:
            return jsonify({"error": "User not found"}), 404
        
        hackathons = session.query(HackathonPost).filter_by(owner_id=user.id).order_by(HackathonPost.created_at.desc()).all()
        
        hackathons_data = []
        for hackathon in hackathons:
            hackathons_data.append({
                "id": hackathon.id,
                "title": hackathon.title,
                "description": hackathon.description,
                "hackathon_name": hackathon.hackathon_name,
                "hackathon_date": hackathon.hackathon_date.astimezone(IST).isoformat() if hackathon.hackathon_date else None,
                "max_team_size": hackathon.max_team_size,
                "current_member_count": hackathon.current_member_count,
                "is_active": hackathon.is_active,
                "created_at": hackathon.created_at.astimezone(IST).isoformat(),
                "skills": [{"id": skill.id, "name": skill.name, "category": skill.category} for skill in hackathon.skills],
                "roles": [{"id": role.id, "name": role.name, "description": role.description, "category": role.category} for role in hackathon.roles],
                "application_count": len(hackathon.applications)
            })
        
        return jsonify(hackathons_data), 200
        
    except Exception as e:
        return jsonify({"error": "Failed to fetch your hackathons"}), 500
    finally:
        session.close()

@hackathon_bp.route('/<int:hackathon_id>', methods=['PUT'])
@jwt_required()
def update_hackathon(hackathon_id):
    session = Session()
    try:
        current_user_id = get_jwt_identity()
        user = session.query(User).filter_by(username=current_user_id).first()
        
        if not user:
            return jsonify({"error": "User not found"}), 404
        
        hackathon = session.query(HackathonPost).filter_by(id=hackathon_id, owner_id=user.id).first()
        if not hackathon:
            return jsonify({"error": "Hackathon not found or not owned by you"}), 404
        
        data = request.get_json()
        
        # Update basic fields
        if 'title' in data:
            hackathon.title = data['title'].strip()
        if 'description' in data:
            hackathon.description = data['description'].strip()
        if 'hackathon_name' in data:
            hackathon.hackathon_name = data['hackathon_name'].strip()
        if 'hackathon_date' in data and data['hackathon_date']:
            hackathon.hackathon_date = datetime.fromisoformat(data['hackathon_date'].replace('Z', '+00:00')).astimezone(IST)
        if 'max_team_size' in data:
            hackathon.max_team_size = int(data['max_team_size']) if data['max_team_size'] else None
        if 'is_active' in data:
            hackathon.is_active = data['is_active']
        
        # Update skills
        if 'skill_ids' in data:
            skills = session.query(Skill).filter(Skill.id.in_(data['skill_ids'])).all()
            hackathon.skills = skills
        
        # Update roles
        if 'role_ids' in data:
            roles = session.query(Role).filter(Role.id.in_(data['role_ids'])).all()
            hackathon.roles = roles
        
        session.commit()
        
        # Log activity
        activity = ActivityLog(
            user_id=user.id,
            action_type="updated_hackathon",
            action_description=f"Updated team search '{hackathon.title}'",
            related_id=hackathon.id
        )
        session.add(activity)
        session.commit()
        
        return jsonify({"message": "Team search updated successfully"}), 200
        
    except Exception as e:
        session.rollback()
        return jsonify({"error": "Failed to update team search"}), 500
    finally:
        session.close()

@hackathon_bp.route('/<int:hackathon_id>', methods=['DELETE'])
@jwt_required()
def delete_hackathon(hackathon_id):
    session = Session()
    try:
        current_user_id = get_jwt_identity()
        user = session.query(User).filter_by(username=current_user_id).first()
        
        if not user:
            return jsonify({"error": "User not found"}), 404
        
        hackathon = session.query(HackathonPost).filter_by(id=hackathon_id, owner_id=user.id).first()
        if not hackathon:
            return jsonify({"error": "Hackathon not found or not owned by you"}), 404
        
        hackathon_title = hackathon.title
        session.delete(hackathon)
        session.commit()
        
        # Log activity
        activity = ActivityLog(
            user_id=user.id,
            action_type="deleted_hackathon",
            action_description=f"Deleted team search '{hackathon_title}'",
            related_id=None
        )
        session.add(activity)
        session.commit()
        
        return jsonify({"message": "Team search deleted successfully"}), 200
        
    except Exception as e:
        session.rollback()
        return jsonify({"error": "Failed to delete team search"}), 500
    finally:
        session.close()

@hackathon_bp.route('/applications/my', methods=['GET'])
@jwt_required()
def get_my_hackathon_applications():
    session = Session()
    try:
        current_user_id = get_jwt_identity()
        user = session.query(User).filter_by(username=current_user_id).first()
        
        if not user:
            return jsonify({"error": "User not found"}), 404
        
        applications = session.query(HackathonApplication).filter_by(user_id=user.id).order_by(HackathonApplication.applied_at.desc()).all()
        
        applications_data = []
        for app in applications:
            applications_data.append({
                "id": app.id,
                "message": app.message,
                "status": app.status,
                "applied_at": app.applied_at.astimezone(IST).isoformat(),
                "hackathon": {
                    "id": app.hackathon.id,
                    "title": app.hackathon.title,
                    "description": app.hackathon.description,
                    "hackathon_name": app.hackathon.hackathon_name,
                    "owner": {
                        "id": app.hackathon.owner.id,
                        "username": app.hackathon.owner.username,
                        "full_name": app.hackathon.owner.full_name,
                        "avatar_url": app.hackathon.owner.avatar_url
                    }
                }
            })
        
        return jsonify(applications_data), 200
        
    except Exception as e:
        return jsonify({"error": "Failed to fetch your hackathon applications"}), 500
    finally:
        session.close()