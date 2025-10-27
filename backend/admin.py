from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime
import logging
from database import Session, User, Project, HackathonPost
from functools import wraps

admin_bp = Blueprint('admin', __name__, url_prefix='/api/admin')
logger = logging.getLogger(__name__)

def admin_required(fn):
    @wraps(fn)
    @jwt_required()
    def wrapper(*args, **kwargs):
        session = Session()
        try:
            current_user_id = get_jwt_identity()
            user = session.query(User).filter_by(username=current_user_id).first()

            if not user or not user.is_admin:
                logger.warning(f"Unauthorized admin access attempt by: {current_user_id}")
                return jsonify({"error": "Admin access required"}), 403

            return fn(*args, **kwargs)
        finally:
            session.close()

    return wrapper

@admin_bp.route('/projects', methods=['GET'])
@admin_required
def get_all_projects():
    session = Session()
    try:
        projects = session.query(Project).order_by(Project.created_at.desc()).all()

        projects_data = []
        for project in projects:
            projects_data.append({
                "id": project.id,
                "name": project.name,
                "description": project.description,
                "status": project.status,
                "is_active": project.is_active,
                "owner": {
                    "id": project.owner.id,
                    "username": project.owner.username,
                    "email": project.owner.email
                },
                "created_at": project.created_at.isoformat(),
                "application_count": len(project.applications)
            })

        return jsonify(projects_data), 200

    except Exception as e:
        logger.error(f"Failed to fetch all projects: {str(e)}")
        return jsonify({"error": "Failed to fetch projects"}), 500
    finally:
        session.close()

@admin_bp.route('/projects/<int:project_id>', methods=['DELETE'])
@admin_required
def delete_project(project_id):
    session = Session()
    try:
        project = session.query(Project).filter_by(id=project_id).first()

        if not project:
            return jsonify({"error": "Project not found"}), 404

        project_name = project.name
        owner_username = project.owner.username

        session.delete(project)
        session.commit()

        logger.info(f"Admin deleted project: {project_name} (ID: {project_id}) by {owner_username}")
        return jsonify({"message": "Project deleted successfully"}), 200

    except Exception as e:
        session.rollback()
        logger.error(f"Failed to delete project: {str(e)}")
        return jsonify({"error": "Failed to delete project"}), 500
    finally:
        session.close()

@admin_bp.route('/hackathons', methods=['GET'])
@admin_required
def get_all_hackathons():
    session = Session()
    try:
        hackathons = session.query(HackathonPost).order_by(HackathonPost.created_at.desc()).all()

        hackathons_data = []
        for hackathon in hackathons:
            hackathons_data.append({
                "id": hackathon.id,
                "title": hackathon.title,
                "description": hackathon.description,
                "hackathon_name": hackathon.hackathon_name,
                "hackathon_date": hackathon.hackathon_date.isoformat() if hackathon.hackathon_date else None,
                "is_active": hackathon.is_active,
                "owner": {
                    "id": hackathon.owner.id,
                    "username": hackathon.owner.username,
                    "email": hackathon.owner.email
                },
                "created_at": hackathon.created_at.isoformat(),
                "application_count": len(hackathon.applications)
            })

        return jsonify(hackathons_data), 200

    except Exception as e:
        logger.error(f"Failed to fetch all hackathons: {str(e)}")
        return jsonify({"error": "Failed to fetch hackathons"}), 500
    finally:
        session.close()

@admin_bp.route('/hackathons/<int:hackathon_id>', methods=['DELETE'])
@admin_required
def delete_hackathon(hackathon_id):
    session = Session()
    try:
        hackathon = session.query(HackathonPost).filter_by(id=hackathon_id).first()

        if not hackathon:
            return jsonify({"error": "Hackathon not found"}), 404

        hackathon_title = hackathon.title
        owner_username = hackathon.owner.username

        session.delete(hackathon)
        session.commit()

        logger.info(f"Admin deleted hackathon: {hackathon_title} (ID: {hackathon_id}) by {owner_username}")
        return jsonify({"message": "Hackathon deleted successfully"}), 200

    except Exception as e:
        session.rollback()
        logger.error(f"Failed to delete hackathon: {str(e)}")
        return jsonify({"error": "Failed to delete hackathon"}), 500
    finally:
        session.close()

@admin_bp.route('/users', methods=['GET'])
@admin_required
def get_all_users():
    session = Session()
    try:
        users = session.query(User).order_by(User.created_at.desc()).all()

        users_data = []
        for user in users:
            users_data.append({
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "full_name": user.full_name,
                "is_active": user.is_active,
                "is_admin": user.is_admin,
                "created_at": user.created_at.isoformat(),
                "project_count": len(user.projects),
                "hackathon_count": len(user.hackathon_posts)
            })

        return jsonify(users_data), 200

    except Exception as e:
        logger.error(f"Failed to fetch all users: {str(e)}")
        return jsonify({"error": "Failed to fetch users"}), 500
    finally:
        session.close()

@admin_bp.route('/users/<int:user_id>/toggle-active', methods=['PUT'])
@admin_required
def toggle_user_active(user_id):
    session = Session()
    try:
        user = session.query(User).filter_by(id=user_id).first()

        if not user:
            return jsonify({"error": "User not found"}), 404

        user.is_active = not user.is_active
        session.commit()

        status = "activated" if user.is_active else "deactivated"
        logger.info(f"Admin {status} user: {user.username} (ID: {user_id})")

        return jsonify({
            "message": f"User {status} successfully",
            "is_active": user.is_active
        }), 200

    except Exception as e:
        session.rollback()
        logger.error(f"Failed to toggle user active status: {str(e)}")
        return jsonify({"error": "Failed to update user"}), 500
    finally:
        session.close()

@admin_bp.route('/stats', methods=['GET'])
@admin_required
def get_stats():
    session = Session()
    try:
        total_users = session.query(User).count()
        active_users = session.query(User).filter_by(is_active=True).count()
        total_projects = session.query(Project).count()
        active_projects = session.query(Project).filter_by(is_active=True).count()
        total_hackathons = session.query(HackathonPost).count()
        active_hackathons = session.query(HackathonPost).filter_by(is_active=True).count()

        return jsonify({
            "users": {
                "total": total_users,
                "active": active_users
            },
            "projects": {
                "total": total_projects,
                "active": active_projects
            },
            "hackathons": {
                "total": total_hackathons,
                "active": active_hackathons
            }
        }), 200

    except Exception as e:
        logger.error(f"Failed to fetch stats: {str(e)}")
        return jsonify({"error": "Failed to fetch stats"}), 500
    finally:
        session.close()
