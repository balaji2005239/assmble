from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime, timezone
import pytz
from database import Session, User, Project, Skill, Role, ProjectApplication, Notification, ActivityLog, ProjectMilestone
import logging

projects_bp = Blueprint('projects', __name__, url_prefix='/api/projects')
logger = logging.getLogger(__name__)

@projects_bp.route('/', methods=['GET'], strict_slashes=False)
@jwt_required()
def get_projects():
    session = Session()
    try:
        # Get query parameters
        page = request.args.get('page', 1, type=int)
        per_page = min(request.args.get('per_page', 10, type=int), 100)
        search = request.args.get('search', '').strip()
        skill_id = request.args.get('skill_id', type=int)
        
        # Base query
        query = session.query(Project).filter(Project.is_active == True)
        
        # Apply filters
        if search:
            query = query.filter(Project.name.ilike(f'%{search}%'))
        
        if skill_id:
            query = query.join(Project.skills).filter(Skill.id == skill_id)
        
        # Get total count
        total = query.count()
        
        # Apply pagination
        offset = (page - 1) * per_page
        projects = query.order_by(Project.created_at.desc()).offset(offset).limit(per_page).all()
        
        # Get current user for checking applications
        current_user_id = get_jwt_identity()
        user = session.query(User).filter_by(username=current_user_id).first()
        
        # Serialize projects
        projects_data = []
        for project in projects:
            # Check if current user has applied
            has_applied = session.query(ProjectApplication).filter_by(
                project_id=project.id,
                user_id=user.id if user else None
            ).first() is not None
            
            projects_data.append({
                "id": project.id,
                "name": project.name,
                "description": project.description,
                "github_url": project.github_url,
                "live_url": project.live_url,
                "status": project.status,
                "created_at": project.created_at.isoformat(),
                "owner": {
                    "id": project.owner.id,
                    "username": project.owner.username,
                    "full_name": project.owner.full_name,
                    "avatar_url": project.owner.avatar_url
                },
                "skills": [{"id": skill.id, "name": skill.name, "category": skill.category} for skill in project.skills],
                "roles": [{"id": role.id, "name": role.name, "description": role.description, "category": role.category} for role in project.roles],
                "application_count": len(project.applications),
                "has_applied": has_applied,
                "is_owner": project.owner_id == (user.id if user else None)
            })
        
        return jsonify({
            "projects": projects_data,
            "pagination": {
                "page": page,
                "per_page": per_page,
                "total": total,
                "pages": (total + per_page - 1) // per_page
            }
        }), 200
        
    except Exception as e:
        logger.error(f"Failed to fetch projects: {str(e)}")
        return jsonify({"error": "Failed to fetch projects"}), 500
    finally:
        session.close()

@projects_bp.route('/suggestions', methods=['GET'])
@jwt_required()
def get_project_suggestions():
    session = Session()
    try:
        current_user_id = get_jwt_identity()
        user = session.query(User).filter_by(username=current_user_id).first()
        
        if not user:
            return jsonify({"error": "User not found"}), 404
        
        limit = request.args.get('limit', 5, type=int)
        
        # Get recent active projects (excluding user's own projects)
        recent_projects = session.query(Project).filter(
            Project.is_active == True,
            Project.owner_id != user.id
        ).order_by(Project.created_at.desc()).limit(limit * 2).all()
        
        if not recent_projects:
            return jsonify([]), 200
        
        suggestions = []
        
        # Simply return recent projects
        for project in recent_projects[:limit]:
            suggestions.append({
                "id": project.id,
                "name": project.name,
                "description": project.description,
                "match_score": 75,  # Static score for recent projects
                "skills": [{"id": skill.id, "name": skill.name} for skill in project.skills],
                "owner": {
                    "id": project.owner.id,
                    "username": project.owner.username,
                    "full_name": project.owner.full_name
                }
            })
        
        return jsonify(suggestions), 200
        
    except Exception as e:
        logger.error(f"Failed to get recent projects: {str(e)}")
        return jsonify({"error": "Failed to get suggestions"}), 500
    finally:
        session.close()

@projects_bp.route('/<int:project_id>', methods=['GET'])
@jwt_required()
def get_project(project_id):
    session = Session()
    try:
        project = session.query(Project).filter_by(id=project_id).first()
        
        if not project:
            return jsonify({"error": "Project not found"}), 404
        
        # Check if current user has applied
        current_user_id = get_jwt_identity()
        user = session.query(User).filter_by(username=current_user_id).first()
        has_applied = session.query(ProjectApplication).filter_by(
            project_id=project_id,
            user_id=user.id if user else None
        ).first() is not None
        
        project_data = {
            "id": project.id,
            "name": project.name,
            "description": project.description,
            "github_url": project.github_url,
            "live_url": project.live_url,
            "status": project.status,
            "is_active": project.is_active,
            "created_at": project.created_at.isoformat(),
            "updated_at": project.updated_at.isoformat(),
            "owner": {
                "id": project.owner.id,
                "username": project.owner.username,
                "full_name": project.owner.full_name,
                "avatar_url": project.owner.avatar_url,
                "bio": project.owner.bio
            },
            "skills": [{"id": skill.id, "name": skill.name, "category": skill.category} for skill in project.skills],
            "roles": [{"id": role.id, "name": role.name, "description": role.description, "category": role.category} for role in project.roles],
            "application_count": len(project.applications),
            "has_applied": has_applied,
            "is_owner": project.owner_id == (user.id if user else None)
        }
        
        return jsonify(project_data), 200
        
    except Exception as e:
        logger.error(f"Failed to fetch project: {str(e)}")
        return jsonify({"error": "Failed to fetch project"}), 500
    finally:
        session.close()

@projects_bp.route('/', methods=['POST'], strict_slashes=False)
@jwt_required()
def create_project():
    session = Session()
    try:
        current_user_id = get_jwt_identity()
        user = session.query(User).filter_by(username=current_user_id).first()
        
        if not user:
            return jsonify({"error": "User not found"}), 404
        
        data = request.get_json()
        
        # Validate required fields
        name = data.get('name', '').strip()
        if not name:
            return jsonify({"error": "Project name is required"}), 400
        
        # Create project
        project = Project(
            name=name,
            description=data.get('description', '').strip(),
            github_url=data.get('github_url', '').strip(),
            live_url=data.get('live_url', '').strip(),
            owner_id=user.id
        )
        
        # Add skills
        skill_ids = data.get('skill_ids', [])
        if skill_ids:
            skills = session.query(Skill).filter(Skill.id.in_(skill_ids)).all()
            project.skills = skills
        
        # Add roles
        role_ids = data.get('role_ids', [])
        if role_ids:
            roles = session.query(Role).filter(Role.id.in_(role_ids)).all()
            project.roles = roles
        
        session.add(project)
        session.commit()
        
        # Log activity
        activity = ActivityLog(
            user_id=user.id,
            action_type="created_project",
            action_description=f"Created project '{project.name}'",
            related_id=project.id
        )
        session.add(activity)
        session.commit()
        
        return jsonify({
            "message": "Project created successfully",
            "project_id": project.id
        }), 201
        
    except Exception as e:
        session.rollback()
        logger.error(f"Failed to create project: {str(e)}")
        return jsonify({"error": "Failed to create project"}), 500
    finally:
        session.close()

@projects_bp.route('/<int:project_id>/applications', methods=['POST'])
@jwt_required()
def apply_to_project(project_id):
    session = Session()
    try:
        current_user_id = get_jwt_identity()
        user = session.query(User).filter_by(username=current_user_id).first()
        
        if not user:
            return jsonify({"error": "User not found"}), 404
        
        # Check if project exists
        project = session.query(Project).filter_by(id=project_id, is_active=True).first()
        if not project:
            return jsonify({"error": "Project not found"}), 404
        
        # Check if user is project owner
        if project.owner_id == user.id:
            return jsonify({"error": "You cannot apply to your own project"}), 400
        
        # Check if already applied
        existing_application = session.query(ProjectApplication).filter_by(
            project_id=project_id,
            user_id=user.id
        ).first()
        
        if existing_application:
            return jsonify({"error": "You have already applied to this project"}), 400
        
        # Create application
        data = request.get_json()
        application = ProjectApplication(
            project_id=project_id,
            user_id=user.id,
            message=data.get('message', '').strip()
        )
        
        session.add(application)
        
        # Create notification for project owner
        notification = Notification(
            user_id=project.owner_id,
            title="New Project Application",
            content=f"{user.username} applied to your project '{project.name}'",
            type="info"
        )
        session.add(notification)
        
        session.commit()
        
        # Log activity
        activity = ActivityLog(
            user_id=user.id,
            action_type="applied_to_project",
            action_description=f"Applied to project '{project.name}'",
            related_id=project.id
        )
        session.add(activity)
        session.commit()
        
        return jsonify({"message": "Application submitted successfully"}), 201
        
    except Exception as e:
        session.rollback()
        logger.error(f"Failed to submit application: {str(e)}")
        return jsonify({"error": "Failed to submit application"}), 500
    finally:
        session.close()

@projects_bp.route('/<int:project_id>/applications', methods=['GET'])
@jwt_required()
def get_project_applications(project_id):
    session = Session()
    try:
        current_user_id = get_jwt_identity()
        user = session.query(User).filter_by(username=current_user_id).first()
        
        if not user:
            return jsonify({"error": "User not found"}), 404
        
        # Check if user owns the project
        project = session.query(Project).filter_by(id=project_id, owner_id=user.id).first()
        if not project:
            return jsonify({"error": "Project not found or not owned by you"}), 404
        
        applications = session.query(ProjectApplication).filter_by(project_id=project_id).order_by(ProjectApplication.applied_at.desc()).all()
        
        applications_data = []
        for app in applications:
            applications_data.append({
                "id": app.id,
                "message": app.message,
                "status": app.status,
                "applied_at": app.applied_at.isoformat(),
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
        logger.error(f"Failed to fetch applications: {str(e)}")
        return jsonify({"error": "Failed to fetch applications"}), 500
    finally:
        session.close()

@projects_bp.route('/applications/<int:application_id>/status', methods=['PUT'])
@jwt_required()
def update_application_status(application_id):
    session = Session()
    try:
        current_user_id = get_jwt_identity()
        user = session.query(User).filter_by(username=current_user_id).first()
        
        if not user:
            return jsonify({"error": "User not found"}), 404
        
        application = session.query(ProjectApplication).filter_by(id=application_id).first()
        if not application:
            return jsonify({"error": "Application not found"}), 404
        
        # Check if user owns the project
        if application.project.owner_id != user.id:
            return jsonify({"error": "Not authorized to update this application"}), 403
        
        data = request.get_json()
        new_status = data.get('status')
        
        if new_status not in ['accepted', 'rejected']:
            return jsonify({"error": "Invalid status"}), 400
        
        application.status = new_status
        
        # Create notification for applicant
        notification = Notification(
            user_id=application.user_id,
            title="Application Status Updated",
            content=f"Your application for '{application.project.name}' has been {new_status}",
            type="success" if new_status == "accepted" else "info"
        )
        session.add(notification)
        
        session.commit()
        
        # Log activity for project owner
        activity = ActivityLog(
            user_id=user.id,
            action_type="updated_application",
            action_description=f"{'Accepted' if new_status == 'accepted' else 'Rejected'} application for project '{application.project.name}'",
            related_id=application.project.id
        )
        session.add(activity)
        session.commit()
        
        return jsonify({"message": f"Application {new_status} successfully"}), 200
        
    except Exception as e:
        session.rollback()
        logger.error(f"Failed to update application status: {str(e)}")
        return jsonify({"error": "Failed to update application status"}), 500
    finally:
        session.close()

@projects_bp.route('/my', methods=['GET'])
@jwt_required()
def get_my_projects():
    session = Session()
    try:
        current_user_id = get_jwt_identity()
        user = session.query(User).filter_by(username=current_user_id).first()
        
        if not user:
            return jsonify({"error": "User not found"}), 404
        
        projects = session.query(Project).filter_by(owner_id=user.id).order_by(Project.created_at.desc()).all()
        
        projects_data = []
        for project in projects:
            projects_data.append({
                "id": project.id,
                "name": project.name,
                "description": project.description,
                "github_url": project.github_url,
                "live_url": project.live_url,
                "status": project.status,
                "is_active": project.is_active,
                "created_at": project.created_at.isoformat(),
                "updated_at": project.updated_at.isoformat(),
                "skills": [{"id": skill.id, "name": skill.name, "category": skill.category} for skill in project.skills],
                "roles": [{"id": role.id, "name": role.name, "description": role.description, "category": role.category} for role in project.roles],
                "application_count": len(project.applications)
            })
        
        return jsonify(projects_data), 200
        
    except Exception as e:
        logger.error(f"Failed to fetch your projects: {str(e)}")
        return jsonify({"error": "Failed to fetch your projects"}), 500
    finally:
        session.close()

@projects_bp.route('/applications/my', methods=['GET'])
@jwt_required()
def get_my_applications():
    session = Session()
    try:
        current_user_id = get_jwt_identity()
        user = session.query(User).filter_by(username=current_user_id).first()
        
        if not user:
            return jsonify({"error": "User not found"}), 404
        
        applications = session.query(ProjectApplication).filter_by(user_id=user.id).order_by(ProjectApplication.applied_at.desc()).all()
        
        applications_data = []
        for app in applications:
            applications_data.append({
                "id": app.id,
                "message": app.message,
                "status": app.status,
                "applied_at": app.applied_at.isoformat(),
                "project": {
                    "id": app.project.id,
                    "name": app.project.name,
                    "description": app.project.description,
                    "owner": {
                        "id": app.project.owner.id,
                        "username": app.project.owner.username,
                        "full_name": app.project.owner.full_name,
                        "avatar_url": app.project.owner.avatar_url
                    }
                }
            })
        
        return jsonify(applications_data), 200
        
    except Exception as e:
        logger.error(f"Failed to fetch your applications: {str(e)}")
        return jsonify({"error": "Failed to fetch your applications"}), 500
    finally:
        session.close()

@projects_bp.route('/<int:project_id>/bookmarks', methods=['POST'])
@jwt_required()
def bookmark_project(project_id):
    session = Session()
    try:
        current_user_id = get_jwt_identity()
        user = session.query(User).filter_by(username=current_user_id).first()
        
        if not user:
            return jsonify({"error": "User not found"}), 404
        
        project = session.query(Project).filter_by(id=project_id).first()
        if not project:
            return jsonify({"error": "Project not found"}), 404
        
        # Check if already bookmarked
        if project in user.bookmarked_projects:
            return jsonify({"error": "Project already bookmarked"}), 400
        
        user.bookmarked_projects.append(project)
        session.commit()
        
        return jsonify({"message": "Project bookmarked successfully"}), 201
        
    except Exception as e:
        session.rollback()
        logger.error(f"Failed to bookmark project: {str(e)}")
        return jsonify({"error": "Failed to bookmark project"}), 500
    finally:
        session.close()

@projects_bp.route('/<int:project_id>/bookmarks', methods=['DELETE'])
@jwt_required()
def remove_bookmark(project_id):
    session = Session()
    try:
        current_user_id = get_jwt_identity()
        user = session.query(User).filter_by(username=current_user_id).first()
        
        if not user:
            return jsonify({"error": "User not found"}), 404
        
        project = session.query(Project).filter_by(id=project_id).first()
        if not project:
            return jsonify({"error": "Project not found"}), 404
        
        # Check if bookmarked
        if project not in user.bookmarked_projects:
            return jsonify({"error": "Project not bookmarked"}), 400
        
        user.bookmarked_projects.remove(project)
        session.commit()
        
        return jsonify({"message": "Bookmark removed successfully"}), 200
        
    except Exception as e:
        session.rollback()
        logger.error(f"Failed to remove bookmark: {str(e)}")
        return jsonify({"error": "Failed to remove bookmark"}), 500
    finally:
        session.close()

@projects_bp.route('/bookmarks', methods=['GET'])
@jwt_required()
def get_bookmarked_projects():
    session = Session()
    try:
        current_user_id = get_jwt_identity()
        user = session.query(User).filter_by(username=current_user_id).first()
        
        if not user:
            return jsonify({"error": "User not found"}), 404
        
        projects_data = []
        for project in user.bookmarked_projects:
            projects_data.append({
                "id": project.id,
                "name": project.name,
                "description": project.description,
                "github_url": project.github_url,
                "live_url": project.live_url,
                "status": project.status,
                "created_at": project.created_at.isoformat(),
                "owner": {
                    "id": project.owner.id,
                    "username": project.owner.username,
                    "full_name": project.owner.full_name,
                    "avatar_url": project.owner.avatar_url
                },
                "skills": [{"id": skill.id, "name": skill.name, "category": skill.category} for skill in project.skills],
                "application_count": len(project.applications)
            })
        
        return jsonify(projects_data), 200
        
    except Exception as e:
        logger.error(f"Failed to fetch bookmarked projects: {str(e)}")
        return jsonify({"error": "Failed to fetch bookmarked projects"}), 500
    finally:
        session.close()

@projects_bp.route('/<int:project_id>', methods=['PUT'])
@jwt_required()
def update_project(project_id):
    session = Session()
    try:
        current_user_id = get_jwt_identity()
        user = session.query(User).filter_by(username=current_user_id).first()
        
        if not user:
            return jsonify({"error": "User not found"}), 404
        
        project = session.query(Project).filter_by(id=project_id, owner_id=user.id).first()
        if not project:
            return jsonify({"error": "Project not found or not owned by you"}), 404
        
        data = request.get_json()
        
        # Update basic fields
        if 'name' in data:
            project.name = data['name'].strip()
        if 'description' in data:
            project.description = data['description'].strip()
        if 'github_url' in data:
            project.github_url = data['github_url'].strip()
        if 'live_url' in data:
            project.live_url = data['live_url'].strip()
        if 'status' in data:
            old_status = project.status
            project.status = data['status']
            
            # Send notifications if project is marked as completed
            if data['status'] == 'completed' and old_status != 'completed':
                accepted_applications = session.query(ProjectApplication).filter_by(
                    project_id=project_id,
                    status='accepted'
                ).all()
                
                for app in accepted_applications:
                    notification = Notification(
                        user_id=app.user_id,
                        title="Project Completed",
                        content=f"The project '{project.name}' has been marked as completed!",
                        type="success"
                    )
                    session.add(notification)
        
        if 'is_active' in data:
            project.is_active = data['is_active']
        
        # Update skills
        if 'skill_ids' in data:
            skills = session.query(Skill).filter(Skill.id.in_(data['skill_ids'])).all()
            project.skills = skills
        
        # Update roles
        if 'role_ids' in data:
            roles = session.query(Role).filter(Role.id.in_(data['role_ids'])).all()
            project.roles = roles
        
        project.updated_at = datetime.now(pytz.timezone('Asia/Kolkata'))
        session.commit()
        
        # Log activity
        activity = ActivityLog(
            user_id=user.id,
            action_type="updated_project",
            action_description=f"Updated project '{project.name}'",
            related_id=project.id
        )
        session.add(activity)
        session.commit()
        
        return jsonify({"message": "Project updated successfully"}), 200
        
    except Exception as e:
        session.rollback()
        logger.error(f"Failed to update project: {str(e)}")
        return jsonify({"error": "Failed to update project"}), 500
    finally:
        session.close()

@projects_bp.route('/<int:project_id>', methods=['DELETE'])
@jwt_required()
def delete_project(project_id):
    session = Session()
    try:
        current_user_id = get_jwt_identity()
        user = session.query(User).filter_by(username=current_user_id).first()
        
        if not user:
            return jsonify({"error": "User not found"}), 404
        
        project = session.query(Project).filter_by(id=project_id, owner_id=user.id).first()
        if not project:
            return jsonify({"error": "Project not found or not owned by you"}), 404
        
        project_name = project.name
        session.delete(project)
        session.commit()
        
        # Log activity
        activity = ActivityLog(
            user_id=user.id,
            action_type="deleted_project",
            action_description=f"Deleted project '{project_name}'",
            related_id=None
        )
        session.add(activity)
        session.commit()
        
        return jsonify({"message": "Project deleted successfully"}), 200
        
    except Exception as e:
        session.rollback()
        logger.error(f"Failed to delete project: {str(e)}")
        return jsonify({"error": "Failed to delete project"}), 500
    finally:
        session.close()