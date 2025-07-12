from flask import Blueprint, request, jsonify, redirect, url_for
from flask_jwt_extended import create_access_token, create_refresh_token
import requests
import os
from database import Session, User, GitHubRepo
from datetime import datetime

oauth_bp = Blueprint('oauth', __name__, url_prefix='/api/oauth')

@oauth_bp.route('/github/login', methods=['GET'])
def github_login():
    client_id = os.getenv('GITHUB_CLIENT_ID')
    redirect_uri = request.args.get('redirect_uri', 'http://localhost:3000/auth/github/callback')
    
    github_auth_url = f"https://github.com/login/oauth/authorize?client_id={client_id}&redirect_uri={redirect_uri}&scope=user:email,repo"
    
    return jsonify({"auth_url": github_auth_url}), 200

@oauth_bp.route('/github/callback', methods=['POST'])
def github_callback():
    session = Session()
    try:
        data = request.get_json()
        code = data.get('code')
        
        if not code:
            return jsonify({"error": "Authorization code is required"}), 400
        
        # Exchange code for access token
        token_response = requests.post('https://github.com/login/oauth/access_token', {
            'client_id': os.getenv('GITHUB_CLIENT_ID'),
            'client_secret': os.getenv('GITHUB_CLIENT_SECRET'),
            'code': code,
        }, headers={'Accept': 'application/json'})
        
        token_data = token_response.json()
        
        if 'access_token' not in token_data:
            return jsonify({"error": "Failed to get access token"}), 400
        
        access_token = token_data['access_token']
        
        # Get user info from GitHub
        user_response = requests.get('https://api.github.com/user', headers={
            'Authorization': f'token {access_token}',
            'Accept': 'application/vnd.github.v3+json'
        })
        
        if user_response.status_code != 200:
            return jsonify({"error": "Failed to get user info from GitHub"}), 400
        
        github_user = user_response.json()
        
        # Get user email if not public
        email = github_user.get('email')
        if not email:
            email_response = requests.get('https://api.github.com/user/emails', headers={
                'Authorization': f'token {access_token}',
                'Accept': 'application/vnd.github.v3+json'
            })
            
            if email_response.status_code == 200:
                emails = email_response.json()
                primary_email = next((e['email'] for e in emails if e['primary']), None)
                if primary_email:
                    email = primary_email
        
        if not email:
            return jsonify({"error": "Could not get email from GitHub"}), 400
        
        # Check if user exists
        user = session.query(User).filter_by(github_id=str(github_user['id'])).first()
        
        if not user:
            # Check if email is already used
            existing_user = session.query(User).filter_by(email=email).first()
            if existing_user:
                # Link GitHub account to existing user
                existing_user.github_id = str(github_user['id'])
                existing_user.github_username = github_user['login']
                existing_user.avatar_url = github_user.get('avatar_url')
                user = existing_user
            else:
                # Create new user
                user = User(
                    username=github_user['login'],
                    email=email,
                    full_name=github_user.get('name', github_user['login']),
                    bio=github_user.get('bio'),
                    location=github_user.get('location'),
                    avatar_url=github_user.get('avatar_url'),
                    github_id=str(github_user['id']),
                    github_username=github_user['login']
                )
                session.add(user)
        else:
            # Update existing user info
            user.avatar_url = github_user.get('avatar_url')
            user.github_username = github_user['login']
            if github_user.get('name'):
                user.full_name = github_user['name']
            if github_user.get('bio'):
                user.bio = github_user['bio']
            if github_user.get('location'):
                user.location = github_user['location']
        
        user.last_login = datetime.utcnow()
        session.commit()
        
        # Sync GitHub repositories
        sync_github_repos(user.id, access_token)
        
        # Create JWT tokens
        jwt_access_token = create_access_token(identity=str(user.id))
        jwt_refresh_token = create_refresh_token(identity=str(user.id))
        
        return jsonify({
            "message": "GitHub login successful",
            "access_token": jwt_access_token,
            "refresh_token": jwt_refresh_token,
            "user": {
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "full_name": user.full_name,
                "avatar_url": user.avatar_url,
                "bio": user.bio,
                "location": user.location,
                "github_username": user.github_username
            }
        }), 200
        
    except Exception as e:
        session.rollback()
        return jsonify({"error": "GitHub authentication failed"}), 500
    finally:
        session.close()

@oauth_bp.route('/google/login', methods=['GET'])
def google_login():
    client_id = os.getenv('GOOGLE_CLIENT_ID')
    redirect_uri = request.args.get('redirect_uri', 'http://localhost:3000/auth/google/callback')
    
    google_auth_url = f"https://accounts.google.com/o/oauth2/v2/auth?client_id={client_id}&redirect_uri={redirect_uri}&response_type=code&scope=email profile"
    
    return jsonify({"auth_url": google_auth_url}), 200

@oauth_bp.route('/google/callback', methods=['POST'])
def google_callback():
    session = Session()
    try:
        data = request.get_json()
        code = data.get('code')
        
        if not code:
            return jsonify({"error": "Authorization code is required"}), 400
        
        # Exchange code for access token
        token_response = requests.post('https://oauth2.googleapis.com/token', {
            'client_id': os.getenv('GOOGLE_CLIENT_ID'),
            'client_secret': os.getenv('GOOGLE_CLIENT_SECRET'),
            'code': code,
            'grant_type': 'authorization_code',
            'redirect_uri': 'http://localhost:3000/auth/google/callback'
        })
        
        token_data = token_response.json()
        
        if 'access_token' not in token_data:
            return jsonify({"error": "Failed to get access token"}), 400
        
        access_token = token_data['access_token']
        
        # Get user info from Google
        user_response = requests.get('https://www.googleapis.com/oauth2/v2/userinfo', headers={
            'Authorization': f'Bearer {access_token}'
        })
        
        if user_response.status_code != 200:
            return jsonify({"error": "Failed to get user info from Google"}), 400
        
        google_user = user_response.json()
        
        # Check if user exists
        user = session.query(User).filter_by(google_id=google_user['id']).first()
        
        if not user:
            # Check if email is already used
            existing_user = session.query(User).filter_by(email=google_user['email']).first()
            if existing_user:
                # Link Google account to existing user
                existing_user.google_id = google_user['id']
                existing_user.avatar_url = google_user.get('picture')
                user = existing_user
            else:
                # Create new user
                username = google_user['email'].split('@')[0]
                # Make username unique if it already exists
                base_username = username
                counter = 1
                while session.query(User).filter_by(username=username).first():
                    username = f"{base_username}{counter}"
                    counter += 1
                
                user = User(
                    username=username,
                    email=google_user['email'],
                    full_name=google_user.get('name', username),
                    avatar_url=google_user.get('picture'),
                    google_id=google_user['id']
                )
                session.add(user)
        else:
            # Update existing user info
            user.avatar_url = google_user.get('picture')
            if google_user.get('name'):
                user.full_name = google_user['name']
        
        user.last_login = datetime.utcnow()
        session.commit()
        
        # Create JWT tokens
        jwt_access_token = create_access_token(identity=str(user.id))
        jwt_refresh_token = create_refresh_token(identity=str(user.id))
        
        return jsonify({
            "message": "Google login successful",
            "access_token": jwt_access_token,
            "refresh_token": jwt_refresh_token,
            "user": {
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "full_name": user.full_name,
                "avatar_url": user.avatar_url,
                "bio": user.bio,
                "location": user.location
            }
        }), 200
        
    except Exception as e:
        session.rollback()
        return jsonify({"error": "Google authentication failed"}), 500
    finally:
        session.close()

@oauth_bp.route('/github/repos/<int:user_id>', methods=['GET'])
def get_github_repos(user_id):
    session = Session()
    try:
        repos = session.query(GitHubRepo).filter_by(user_id=user_id).order_by(GitHubRepo.stars.desc()).all()
        
        repos_data = []
        for repo in repos:
            repos_data.append({
                "id": repo.id,
                "name": repo.name,
                "description": repo.description,
                "html_url": repo.html_url,
                "language": repo.language,
                "stars": repo.stars,
                "forks": repo.forks,
                "updated_at": repo.updated_at.isoformat()
            })
        
        return jsonify(repos_data), 200
        
    except Exception as e:
        return jsonify({"error": "Failed to fetch GitHub repositories"}), 500
    finally:
        session.close()

def sync_github_repos(user_id, access_token):
    """Sync user's GitHub repositories"""
    session = Session()
    try:
        # Get repositories from GitHub
        repos_response = requests.get('https://api.github.com/user/repos', headers={
            'Authorization': f'token {access_token}',
            'Accept': 'application/vnd.github.v3+json'
        }, params={'per_page': 100, 'sort': 'updated'})
        
        if repos_response.status_code != 200:
            return
        
        github_repos = repos_response.json()
        
        # Clear existing repos
        session.query(GitHubRepo).filter_by(user_id=user_id).delete()
        
        # Add new repos
        for repo_data in github_repos:
            if not repo_data.get('private', True):  # Only public repos
                repo = GitHubRepo(
                    user_id=user_id,
                    repo_id=str(repo_data['id']),
                    name=repo_data['name'],
                    description=repo_data.get('description'),
                    html_url=repo_data['html_url'],
                    language=repo_data.get('language'),
                    stars=repo_data.get('stargazers_count', 0),
                    forks=repo_data.get('forks_count', 0)
                )
                session.add(repo)
        
        session.commit()
        
    except Exception as e:
        session.rollback()
        print(f"Error syncing GitHub repos: {e}")
    finally:
        session.close()