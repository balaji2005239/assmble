from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from database import Session, User, Notification

notifications_bp = Blueprint('notifications', __name__, url_prefix='/api/notifications')

@notifications_bp.route('/', methods=['GET'], strict_slashes=False)
@jwt_required()
def get_notifications():
    session = Session()
    try:
        current_user_id = get_jwt_identity()
        
        # Get query parameters
        page = request.args.get('page', 1, type=int)
        per_page = min(request.args.get('per_page', 20, type=int), 100)
        unread_only = request.args.get('unread_only', 'false').lower() == 'true'
        
        # Base query
        query = session.query(Notification).filter_by(user_id=current_user_id)
        
        # Filter by read status
        if unread_only:
            query = query.filter_by(is_read=False)
        
        # Get total count
        total = query.count()
        
        # Apply pagination
        offset = (page - 1) * per_page
        notifications = query.order_by(Notification.created_at.desc()).offset(offset).limit(per_page).all()
        
        # Serialize notifications
        notifications_data = []
        for notification in notifications:
            notifications_data.append({
                "id": notification.id,
                "title": notification.title,
                "content": notification.content,
                "type": notification.type,
                "is_read": notification.is_read,
                "created_at": notification.created_at.isoformat()
            })
        
        return jsonify({
            "notifications": notifications_data,
            "pagination": {
                "page": page,
                "per_page": per_page,
                "total": total,
                "pages": (total + per_page - 1) // per_page
            }
        }), 200
        
    except Exception as e:
        return jsonify({"error": "Failed to fetch notifications"}), 500
    finally:
        session.close()

@notifications_bp.route('/<int:notification_id>/read', methods=['PUT'])
@jwt_required()
def mark_notification_read(notification_id):
    session = Session()
    try:
        current_user_id = get_jwt_identity()
        
        notification = session.query(Notification).filter_by(
            id=notification_id,
            user_id=current_user_id
        ).first()
        
        if not notification:
            return jsonify({"error": "Notification not found"}), 404
        
        notification.is_read = True
        session.commit()
        
        return jsonify({"message": "Notification marked as read"}), 200
        
    except Exception as e:
        session.rollback()
        return jsonify({"error": "Failed to mark notification as read"}), 500
    finally:
        session.close()

@notifications_bp.route('/mark-all-read', methods=['PUT'])
@jwt_required()
def mark_all_notifications_read():
    session = Session()
    try:
        current_user_id = get_jwt_identity()
        
        notifications = session.query(Notification).filter_by(
            user_id=current_user_id,
            is_read=False
        ).all()
        
        for notification in notifications:
            notification.is_read = True
        
        session.commit()
        
        return jsonify({"message": f"Marked {len(notifications)} notifications as read"}), 200
        
    except Exception as e:
        session.rollback()
        return jsonify({"error": "Failed to mark all notifications as read"}), 500
    finally:
        session.close()

@notifications_bp.route('/<int:notification_id>', methods=['DELETE'])
@jwt_required()
def delete_notification(notification_id):
    session = Session()
    try:
        current_user_id = get_jwt_identity()
        
        notification = session.query(Notification).filter_by(
            id=notification_id,
            user_id=current_user_id
        ).first()
        
        if not notification:
            return jsonify({"error": "Notification not found"}), 404
        
        session.delete(notification)
        session.commit()
        
        return jsonify({"message": "Notification deleted successfully"}), 200
        
    except Exception as e:
        session.rollback()
        return jsonify({"error": "Failed to delete notification"}), 500
    finally:
        session.close()

@notifications_bp.route('/count', methods=['GET'])
@jwt_required()
def get_notification_count():
    session = Session()
    try:
        current_user_id = get_jwt_identity()
        
        total_count = session.query(Notification).filter_by(user_id=current_user_id).count()
        unread_count = session.query(Notification).filter_by(user_id=current_user_id, is_read=False).count()
        
        return jsonify({
            "total": total_count,
            "unread": unread_count
        }), 200
        
    except Exception as e:
        return jsonify({"error": "Failed to fetch notification count"}), 500
    finally:
        session.close()