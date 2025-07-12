from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime
from database import Session, User, Message
from flask_socketio import SocketIO, emit, join_room, leave_room
import logging

chat_bp = Blueprint('chat', __name__, url_prefix='/api/chat')
logger = logging.getLogger(__name__)

# This will be initialized in app.py
socketio = None

def init_socketio(app_socketio):
    global socketio
    socketio = app_socketio
    
    # Register socket event handlers
    @socketio.on('join_chat')
    def on_join_chat(data):
        """Join a chat room for real-time messaging"""
        try:
            user_id = data.get('user_id')
            other_user_id = data.get('other_user_id')
            
            if not user_id or not other_user_id:
                return
            
            # Create a consistent room name for both users
            room = f"chat_{min(user_id, other_user_id)}_{max(user_id, other_user_id)}"
            join_room(room)
            
            logger.info(f"User {user_id} joined chat room {room}")
            
        except Exception as e:
            logger.error(f"Error joining chat room: {str(e)}")

    @socketio.on('leave_chat')
    def on_leave_chat(data):
        """Leave a chat room"""
        try:
            user_id = data.get('user_id')
            other_user_id = data.get('other_user_id')
            
            if not user_id or not other_user_id:
                return
            
            room = f"chat_{min(user_id, other_user_id)}_{max(user_id, other_user_id)}"
            leave_room(room)
            
            logger.info(f"User {user_id} left chat room {room}")
            
        except Exception as e:
            logger.error(f"Error leaving chat room: {str(e)}")

    @socketio.on('send_message')
    def on_send_message(data):
        """Handle real-time message sending"""
        session = Session()
        try:
            sender_id = data.get('sender_id')
            receiver_id = data.get('receiver_id')
            content = data.get('content', '').strip()
            
            if not sender_id or not receiver_id or not content:
                return
            
            # Save message to database
            message = Message(
                sender_id=sender_id,
                receiver_id=receiver_id,
                content=content
            )
            session.add(message)
            session.commit()
            
            # Create room name
            room = f"chat_{min(sender_id, receiver_id)}_{max(sender_id, receiver_id)}"
            
            # Emit message to room
            message_data = {
                "id": message.id,
                "content": message.content,
                "sender_id": message.sender_id,
                "receiver_id": message.receiver_id,
                "is_read": message.is_read,
                "created_at": message.created_at.isoformat(),
                "is_own": False  # Will be determined by client
            }
            
            emit('new_message', message_data, room=room)
            logger.info(f"Message sent from {sender_id} to {receiver_id}")
            
        except Exception as e:
            session.rollback()
            logger.error(f"Error sending message: {str(e)}")
        finally:
            session.close()

    @socketio.on('typing')
    def on_typing(data):
        """Handle typing indicators"""
        try:
            user_id = data.get('user_id')
            other_user_id = data.get('other_user_id')
            is_typing = data.get('is_typing', False)
            
            if not user_id or not other_user_id:
                return
            
            room = f"chat_{min(user_id, other_user_id)}_{max(user_id, other_user_id)}"
            
            emit('user_typing', {
                'user_id': user_id,
                'is_typing': is_typing
            }, room=room, include_self=False)
            
        except Exception as e:
            logger.error(f"Error handling typing indicator: {str(e)}")

@chat_bp.route('/conversations', methods=['GET'])
@jwt_required()
def get_conversations():
    session = Session()
    try:
        current_username = get_jwt_identity()
        current_user = session.query(User).filter_by(username=current_username).first()
        if current_user is None:
            return jsonify({"error": "User not found"}), 404

        # Use current_user throughout:
        user = current_user

        
        # Get all unique users the current user has chatted with
        sent_messages = session.query(Message.receiver_id).filter_by(sender_id=user.id).distinct().all()
        received_messages = session.query(Message.sender_id).filter_by(receiver_id=user.id).distinct().all()
        
        # Combine and get unique user IDs
        user_ids = set()
        for msg in sent_messages:
            user_ids.add(msg[0])
        for msg in received_messages:
            user_ids.add(msg[0])
        
        # Remove current user from the list
        user_ids.discard(user.id)
        
        conversations = []
        for user_id in user_ids:
            # Get the last message between current user and this user
            last_message = session.query(Message).filter(
                ((Message.sender_id == user.id) & (Message.receiver_id == user_id)) |
                ((Message.sender_id == user_id) & (Message.receiver_id == user.id))
            ).order_by(Message.created_at.desc()).first()
            
            if last_message:
                # Get user info
                chat_user = session.query(User).filter_by(id=user_id).first()
                if chat_user:
                    # Count unread messages from this user
                    unread_count = session.query(Message).filter_by(
                        sender_id=user_id,
                        receiver_id=user.id,
                        is_read=False
                    ).count()
                    
                    conversations.append({
                        "user": {
                            "id": chat_user.id,
                            "username": chat_user.username,
                            "full_name": chat_user.full_name,
                            "avatar_url": chat_user.avatar_url
                        },
                        "last_message": {
                            "id": last_message.id,
                            "content": last_message.content,
                            "sender_id": last_message.sender_id,
                            "receiver_id": last_message.receiver_id,
                            "created_at": last_message.created_at.isoformat(),
                            "is_read": last_message.is_read
                        },
                        "unread_count": unread_count
                    })
        
        # Sort conversations by last message time
        conversations.sort(key=lambda x: x["last_message"]["created_at"], reverse=True)
        
        return jsonify(conversations), 200
        
    except Exception as e:
        logger.error(f"Failed to fetch conversations: {str(e)}")
        return jsonify({"error": "Failed to fetch conversations"}), 500
    finally:
        session.close()

@chat_bp.route('/messages/<int:user_id>', methods=['GET'])
@jwt_required()
def get_messages(user_id):
    session = Session()
    try:
        current_username = get_jwt_identity()
        current_user = session.query(User).filter_by(username=current_username).first()
        if current_user is None:
            return jsonify({"error": "User not found"}), 404

        # Use current_user throughout:
        user = current_user
        
        # Get query parameters
        page = request.args.get('page', 1, type=int)
        per_page = min(request.args.get('per_page', 50, type=int), 100)
        
        # Get messages between current user and specified user
        query = session.query(Message).filter(
            ((Message.sender_id == user.id) & (Message.receiver_id == user_id)) |
            ((Message.sender_id == user_id) & (Message.receiver_id == user.id))
        )
        
        # Get total count
        total = query.count()
        
        # Apply pagination (newest first)
        offset = (page - 1) * per_page
        messages = query.order_by(Message.created_at.desc()).offset(offset).limit(per_page).all()
        
        # Mark messages from the other user as read
        unread_messages = session.query(Message).filter_by(
            sender_id=user_id,
            receiver_id=user.id,
            is_read=False
        ).all()
        
        for message in unread_messages:
            message.is_read = True
        
        if unread_messages:
            session.commit()
        
        # Serialize messages
        messages_data = []
        for message in reversed(messages):  # Reverse to show oldest first
            messages_data.append({
                "id": message.id,
                "content": message.content,
                "sender_id": message.sender_id,
                "receiver_id": message.receiver_id,
                "is_read": message.is_read,
                "created_at": message.created_at.isoformat(),
                "is_own": message.sender_id == user.id
            })
        
        return jsonify({
            "messages": messages_data,
            "pagination": {
                "page": page,
                "per_page": per_page,
                "total": total,
                "pages": (total + per_page - 1) // per_page
            }
        }), 200
        
    except Exception as e:
        logger.error(f"Failed to fetch messages: {str(e)}")
        return jsonify({"error": "Failed to fetch messages"}), 500
    finally:
        session.close()

@chat_bp.route('/messages', methods=['POST'])
@jwt_required()
def send_message():
    session = Session()
    try:
        current_username = get_jwt_identity()
        current_user = session.query(User).filter_by(username=current_username).first()
        if current_user is None:
            return jsonify({"error": "User not found"}), 404

        # Use current_user throughout:
        user = current_user
        
        data = request.get_json()
        
        receiver_id = data.get('receiver_id')
        content = data.get('content', '').strip()
        
        if not receiver_id or not content:
            return jsonify({"error": "Receiver ID and content are required"}), 400
        
        # Check if receiver exists
        receiver = session.query(User).filter_by(id=receiver_id).first()
        if not receiver:
            return jsonify({"error": "Receiver not found"}), 404
        
        # Don't allow sending messages to self
        if int(receiver_id) == user.id:
            return jsonify({"error": "Cannot send message to yourself"}), 400
        
        # Create message
        message = Message(
            sender_id=user.id,
            receiver_id=receiver_id,
            content=content
        )
        
        session.add(message)
        session.commit()
        
        # Return the created message
        message_data = {
            "id": message.id,
            "content": message.content,
            "sender_id": message.sender_id,
            "receiver_id": message.receiver_id,
            "is_read": message.is_read,
            "created_at": message.created_at.isoformat(),
            "is_own": True
        }
        
        return jsonify(message_data), 201
        
    except Exception as e:
        session.rollback()
        logger.error(f"Failed to send message: {str(e)}")
        return jsonify({"error": "Failed to send message"}), 500
    finally:
        session.close()

@chat_bp.route('/users/search', methods=['GET'])
@jwt_required()
def search_users():
    session = Session()
    try:
        current_username = get_jwt_identity()
        current_user = session.query(User).filter_by(username=current_username).first()
        if current_user is None:
            return jsonify({"error": "User not found"}), 404

        # Use current_user throughout:
        user = current_user
        
        query = request.args.get('q', '').strip()
        
        if not query:
            return jsonify([]), 200
        
        # Search users by username or full name
        users = session.query(User).filter(
            (User.username.ilike(f'%{query}%')) |
            (User.full_name.ilike(f'%{query}%'))
        ).filter(User.id != user.id).filter(User.is_active == True).limit(10).all()
        
        users_data = []
        for search_user in users:
            users_data.append({
                "id": search_user.id,
                "username": search_user.username,
                "full_name": search_user.full_name,
                "avatar_url": search_user.avatar_url,
                "bio": search_user.bio
            })
        
        return jsonify(users_data), 200
        
    except Exception as e:
        logger.error(f"Failed to search users: {str(e)}")
        return jsonify({"error": "Failed to search users"}), 500
    finally:
        session.close()

@chat_bp.route('/unread-count', methods=['GET'])
@jwt_required()
def get_unread_count():
    session = Session()
    try:
        current_username = get_jwt_identity()
        current_user = session.query(User).filter_by(username=current_username).first()
        if current_user is None:
            return jsonify({"error": "User not found"}), 404

        # Use current_user throughout:
        user = current_user
        
        unread_count = session.query(Message).filter_by(
            receiver_id=user.id,
            is_read=False
        ).count()
        
        return jsonify({"unread_count": unread_count}), 200
        
    except Exception as e:
        logger.error(f"Failed to fetch unread count: {str(e)}")
        return jsonify({"error": "Failed to fetch unread count"}), 500
    finally:
        session.close()