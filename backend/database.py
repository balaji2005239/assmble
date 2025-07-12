from sqlalchemy import create_engine, Column, Integer, String, ForeignKey, DateTime, Boolean, Text, Table, func
from sqlalchemy.orm import sessionmaker, declarative_base, relationship, scoped_session
from datetime import datetime, timezone
import pytz
import os
import logging

logger = logging.getLogger(__name__)

# Database setup
DATABASE_URL = os.getenv('DATABASE_URL', 'sqlite:///assemble.db')
logger.info(f"Database URL: {DATABASE_URL}")

try:
    engine = create_engine(DATABASE_URL, echo=False)
    logger.info("Database engine created successfully")
except Exception as e:
    logger.error(f"Failed to create database engine: {str(e)}")
    raise

Base = declarative_base()

SessionFactory = sessionmaker(bind=engine)
Session = scoped_session(SessionFactory)

# Set Indian timezone
IST = pytz.timezone('Asia/Kolkata')

# Association tables
user_skills = Table(
    'user_skills',
    Base.metadata,
    Column('user_id', Integer, ForeignKey('users.id'), primary_key=True),
    Column('skill_id', Integer, ForeignKey('skills.id'), primary_key=True)
)

user_roles = Table(
    'user_roles',
    Base.metadata,
    Column('user_id', Integer, ForeignKey('users.id'), primary_key=True),
    Column('role_id', Integer, ForeignKey('roles.id'), primary_key=True)
)

project_skills = Table(
    'project_skills',
    Base.metadata,
    Column('project_id', Integer, ForeignKey('projects.id'), primary_key=True),
    Column('skill_id', Integer, ForeignKey('skills.id'), primary_key=True)
)

project_roles = Table(
    'project_roles',
    Base.metadata,
    Column('project_id', Integer, ForeignKey('projects.id'), primary_key=True),
    Column('role_id', Integer, ForeignKey('roles.id'), primary_key=True)
)

user_bookmarks = Table(
    'user_bookmarks',
    Base.metadata,
    Column('user_id', Integer, ForeignKey('users.id'), primary_key=True),
    Column('project_id', Integer, ForeignKey('projects.id'), primary_key=True),
    Column('created_at', DateTime, default=lambda: datetime.now(IST))
)

hackathon_skills = Table(
    'hackathon_skills',
    Base.metadata,
    Column('hackathon_id', Integer, ForeignKey('hackathon_posts.id'), primary_key=True),
    Column('skill_id', Integer, ForeignKey('skills.id'), primary_key=True)
)

hackathon_roles = Table(
    'hackathon_roles',
    Base.metadata,
    Column('hackathon_id', Integer, ForeignKey('hackathon_posts.id'), primary_key=True),
    Column('role_id', Integer, ForeignKey('roles.id'), primary_key=True)
)

class User(Base):
    __tablename__ = 'users'
    
    id = Column(Integer, primary_key=True)
    username = Column(String(80), unique=True, nullable=False)
    email = Column(String(120), unique=True, nullable=False)
    password = Column(String(255), nullable=True)
    full_name = Column(String(100), nullable=True)
    bio = Column(Text, nullable=True)
    location = Column(String(100), nullable=True)
    experience = Column(String(50), nullable=True)
    avatar_url = Column(String(255), nullable=True)
    
    # Social Links
    github_url = Column(String(255), nullable=True)
    linkedin_url = Column(String(255), nullable=True)
    twitter_url = Column(String(255), nullable=True)
    portfolio_url = Column(String(255), nullable=True)
    
    # Contact Preferences
    preferred_contact = Column(String(50), nullable=True)  # email, chat, linkedin
    availability = Column(String(50), nullable=True)  # available, busy, unavailable
    open_to_opportunities = Column(Boolean, default=True)
    
    is_active = Column(Boolean, default=True)
    last_login = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(IST))
    updated_at = Column(DateTime, default=lambda: datetime.now(IST), onupdate=lambda: datetime.now(IST))
    
    # Relationships
    projects = relationship('Project', back_populates='owner', cascade='all, delete-orphan')
    skills = relationship('Skill', secondary=user_skills, back_populates='users')
    roles = relationship('Role', secondary=user_roles, back_populates='users')
    notifications = relationship('Notification', back_populates='user', cascade='all, delete-orphan')
    hackathon_posts = relationship('HackathonPost', back_populates='owner')
    sent_messages = relationship('Message', foreign_keys='Message.sender_id', back_populates='sender')
    received_messages = relationship('Message', foreign_keys='Message.receiver_id', back_populates='receiver')
    portfolio_items = relationship('PortfolioItem', back_populates='user', cascade='all, delete-orphan')
    activity_logs = relationship('ActivityLog', back_populates='user', cascade='all, delete-orphan')
    bookmarked_projects = relationship('Project', secondary=user_bookmarks, back_populates='bookmarked_by')

class Project(Base):
    __tablename__ = 'projects'
    
    id = Column(Integer, primary_key=True)
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    github_url = Column(String(255), nullable=True)
    live_url = Column(String(255), nullable=True)
    status = Column(String(20), default='active')
    is_active = Column(Boolean, default=True)
    owner_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(IST))
    updated_at = Column(DateTime, default=lambda: datetime.now(IST), onupdate=lambda: datetime.now(IST))
    
    # Relationships
    owner = relationship('User', back_populates='projects')
    skills = relationship('Skill', secondary=project_skills, back_populates='projects')
    roles = relationship('Role', secondary=project_roles, back_populates='projects')
    applications = relationship('ProjectApplication', back_populates='project', cascade='all, delete-orphan')
    bookmarked_by = relationship('User', secondary=user_bookmarks, back_populates='bookmarked_projects')
    milestones = relationship('ProjectMilestone', back_populates='project', cascade='all, delete-orphan')

class Skill(Base):
    __tablename__ = 'skills'
    
    id = Column(Integer, primary_key=True)
    name = Column(String(50), unique=True, nullable=False)
    category = Column(String(50), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(IST))
    
    # Relationships
    users = relationship('User', secondary=user_skills, back_populates='skills')
    projects = relationship('Project', secondary=project_skills, back_populates='skills')
    hackathons = relationship('HackathonPost', secondary=hackathon_skills, back_populates='skills')

class Role(Base):
    __tablename__ = 'roles'
    
    id = Column(Integer, primary_key=True)
    name = Column(String(50), unique=True, nullable=False)
    description = Column(Text, nullable=True)
    category = Column(String(50), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(IST))
    
    # Relationships
    users = relationship('User', secondary=user_roles, back_populates='roles')
    projects = relationship('Project', secondary=project_roles, back_populates='roles')
    hackathons = relationship('HackathonPost', secondary=hackathon_roles, back_populates='roles')

class ProjectApplication(Base):
    __tablename__ = 'project_applications'
    
    id = Column(Integer, primary_key=True)
    project_id = Column(Integer, ForeignKey('projects.id'), nullable=False)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    message = Column(Text, nullable=True)
    status = Column(String(20), default='pending')  # pending, accepted, rejected
    applied_at = Column(DateTime, default=lambda: datetime.now(IST))
    
    # Relationships
    project = relationship('Project', back_populates='applications')
    user = relationship('User')

class Notification(Base):
    __tablename__ = 'notifications'
    
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    title = Column(String(100), nullable=False)
    content = Column(Text, nullable=False)
    type = Column(String(20), default='info')  # info, success, warning, error
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(IST))
    
    # Relationships
    user = relationship('User', back_populates='notifications')

class HackathonPost(Base):
    __tablename__ = 'hackathon_posts'
    
    id = Column(Integer, primary_key=True)
    title = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    hackathon_name = Column(String(100), nullable=False)
    hackathon_date = Column(DateTime, nullable=True)
    max_team_size = Column(Integer, nullable=True)
    current_member_count = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    owner_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(IST))
    
    # Relationships
    owner = relationship('User', back_populates='hackathon_posts')
    skills = relationship('Skill', secondary=hackathon_skills, back_populates='hackathons')
    roles = relationship('Role', secondary=hackathon_roles, back_populates='hackathons')
    applications = relationship('HackathonApplication', back_populates='hackathon', cascade='all, delete-orphan')

class HackathonApplication(Base):
    __tablename__ = 'hackathon_applications'
    
    id = Column(Integer, primary_key=True)
    hackathon_id = Column(Integer, ForeignKey('hackathon_posts.id'), nullable=False)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    message = Column(Text, nullable=True)
    status = Column(String(20), default='pending')
    applied_at = Column(DateTime, default=lambda: datetime.now(IST))
    
    # Relationships
    hackathon = relationship('HackathonPost', back_populates='applications')
    user = relationship('User')

class Message(Base):
    __tablename__ = 'messages'
    
    id = Column(Integer, primary_key=True)
    sender_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    receiver_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    content = Column(Text, nullable=False)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(IST))
    
    # Relationships
    sender = relationship('User', foreign_keys=[sender_id], back_populates='sent_messages')
    receiver = relationship('User', foreign_keys=[receiver_id], back_populates='received_messages')

class PortfolioItem(Base):
    __tablename__ = 'portfolio_items'
    
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    title = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    image_url = Column(String(255), nullable=True)
    project_url = Column(String(255), nullable=True)
    github_url = Column(String(255), nullable=True)
    technologies = Column(Text, nullable=True)  # JSON string of tech stack
    created_at = Column(DateTime, default=lambda: datetime.now(IST))
    
    # Relationships
    user = relationship('User', back_populates='portfolio_items')
def init_db():
    """Initialize database and create tables"""
    try:
        logger.info("Creating database tables...")
        Base.metadata.create_all(engine)
        logger.info("Database tables created successfully")
        
        # Create default skills and roles if they don't exist
        session = Session()
        try:
            skill_count = session.query(Skill).count()
            role_count = session.query(Role).count()
            logger.info(f"Current skill count: {skill_count}, role count: {role_count}")
            
            if skill_count == 0:
                logger.info("Creating default skills...")
                default_skills = [
                    {'name': 'Python', 'category': 'Backend'},
                    {'name': 'JavaScript', 'category': 'Frontend'},
                    {'name': 'React', 'category': 'Frontend'},
                    {'name': 'Node.js', 'category': 'Backend'},
                    {'name': 'Flask', 'category': 'Backend'},
                    {'name': 'Django', 'category': 'Backend'},
                    {'name': 'Vue.js', 'category': 'Frontend'},
                    {'name': 'Angular', 'category': 'Frontend'},
                    {'name': 'TypeScript', 'category': 'Language'},
                    {'name': 'Java', 'category': 'Backend'},
                    {'name': 'C++', 'category': 'Language'},
                    {'name': 'Go', 'category': 'Backend'},
                    {'name': 'Rust', 'category': 'Language'},
                    {'name': 'Swift', 'category': 'Mobile'},
                    {'name': 'Kotlin', 'category': 'Mobile'},
                    {'name': 'React Native', 'category': 'Mobile'},
                    {'name': 'Flutter', 'category': 'Mobile'},
                    {'name': 'Docker', 'category': 'DevOps'},
                    {'name': 'Kubernetes', 'category': 'DevOps'},
                    {'name': 'AWS', 'category': 'Cloud'},
                    {'name': 'Azure', 'category': 'Cloud'},
                    {'name': 'GCP', 'category': 'Cloud'},
                    {'name': 'MongoDB', 'category': 'Database'},
                    {'name': 'PostgreSQL', 'category': 'Database'},
                    {'name': 'MySQL', 'category': 'Database'},
                    {'name': 'Redis', 'category': 'Database'},
                    {'name': 'GraphQL', 'category': 'API'},
                    {'name': 'REST API', 'category': 'API'},
                    {'name': 'Machine Learning', 'category': 'AI/ML'},
                    {'name': 'Deep Learning', 'category': 'AI/ML'},
                    {'name': 'TensorFlow', 'category': 'AI/ML'},
                    {'name': 'PyTorch', 'category': 'AI/ML'},
                    {'name': 'HTML/CSS', 'category': 'Frontend'},
                    {'name': 'Tailwind CSS', 'category': 'Frontend'},
                    {'name': 'Bootstrap', 'category': 'Frontend'},
                    {'name': 'Figma', 'category': 'Design'},
                    {'name': 'Adobe XD', 'category': 'Design'},
                    {'name': 'UI/UX Design', 'category': 'Design'},
                ]
                
                for skill_data in default_skills:
                    skill = Skill(**skill_data)
                    session.add(skill)
                
                session.commit()
                logger.info(f"Created {len(default_skills)} default skills successfully")
            else:
                logger.info("Default skills already exist, skipping creation")
            
            if role_count == 0:
                logger.info("Creating default roles...")
                default_roles = [
                    {'name': 'Full Stack Developer', 'description': 'Works on both frontend and backend', 'category': 'Development'},
                    {'name': 'Frontend Developer', 'description': 'Focuses on user interface and experience', 'category': 'Development'},
                    {'name': 'Backend Developer', 'description': 'Handles server-side logic and databases', 'category': 'Development'},
                    {'name': 'Mobile Developer', 'description': 'Develops mobile applications', 'category': 'Development'},
                    {'name': 'MERN Stack Developer', 'description': 'MongoDB, Express, React, Node.js specialist', 'category': 'Development'},
                    {'name': 'MEAN Stack Developer', 'description': 'MongoDB, Express, Angular, Node.js specialist', 'category': 'Development'},
                    {'name': 'Django Developer', 'description': 'Python Django framework specialist', 'category': 'Development'},
                    {'name': 'React Developer', 'description': 'React.js specialist', 'category': 'Development'},
                    {'name': 'Vue.js Developer', 'description': 'Vue.js framework specialist', 'category': 'Development'},
                    {'name': 'Angular Developer', 'description': 'Angular framework specialist', 'category': 'Development'},
                    {'name': 'DevOps Engineer', 'description': 'Handles deployment and infrastructure', 'category': 'Operations'},
                    {'name': 'Cloud Engineer', 'description': 'Cloud infrastructure specialist', 'category': 'Operations'},
                    {'name': 'Data Scientist', 'description': 'Analyzes and interprets data', 'category': 'Data'},
                    {'name': 'Machine Learning Engineer', 'description': 'Builds ML models and systems', 'category': 'AI/ML'},
                    {'name': 'AI Engineer', 'description': 'Artificial Intelligence specialist', 'category': 'AI/ML'},
                    {'name': 'UI/UX Designer', 'description': 'Designs user interfaces and experiences', 'category': 'Design'},
                    {'name': 'Product Designer', 'description': 'Designs product experiences', 'category': 'Design'},
                    {'name': 'Graphic Designer', 'description': 'Creates visual content', 'category': 'Design'},
                    {'name': 'Project Manager', 'description': 'Manages project timeline and resources', 'category': 'Management'},
                    {'name': 'Product Manager', 'description': 'Manages product strategy and roadmap', 'category': 'Management'},
                    {'name': 'QA Engineer', 'description': 'Tests and ensures quality', 'category': 'Quality'},
                    {'name': 'Security Engineer', 'description': 'Handles cybersecurity', 'category': 'Security'},
                    {'name': 'Database Administrator', 'description': 'Manages databases', 'category': 'Database'},
                    {'name': 'System Administrator', 'description': 'Manages systems and servers', 'category': 'Operations'},
                    {'name': 'Technical Writer', 'description': 'Creates technical documentation', 'category': 'Documentation'},
                ]
                
                for role_data in default_roles:
                    role = Role(**role_data)
                    session.add(role)
                
                session.commit()
                logger.info(f"Created {len(default_roles)} default roles successfully")
            else:
                logger.info("Default roles already exist, skipping creation")
                
        except Exception as e:
            session.rollback()
            logger.error(f"Error creating default data: {type(e).__name__}: {str(e)}")
            raise
        finally:
            session.close()
            
    except Exception as e:
        logger.error(f"Database initialization failed: {type(e).__name__}: {str(e)}")
        raise

class ActivityLog(Base):
    __tablename__ = 'activity_logs'
    
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    action_type = Column(String(50), nullable=False)  # created_project, applied_to_project, etc.
    action_description = Column(String(255), nullable=False)
    related_id = Column(Integer, nullable=True)  # ID of related project/hackathon
    created_at = Column(DateTime, default=lambda: datetime.now(IST))
    
    # Relationships
    user = relationship('User', back_populates='activity_logs')

class ProjectMilestone(Base):
    __tablename__ = 'project_milestones'
    
    id = Column(Integer, primary_key=True)
    project_id = Column(Integer, ForeignKey('projects.id'), nullable=False)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    due_date = Column(DateTime, nullable=True)
    is_completed = Column(Boolean, default=False)
    completed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(IST))
    updated_at = Column(DateTime, default=lambda: datetime.now(IST), onupdate=lambda: datetime.now(IST))
    
    # Relationships
    project = relationship('Project', back_populates='milestones')

if __name__ == '__main__':
    try:
        init_db()
        logger.info("Database initialization completed successfully")
    except Exception as e:
        logger.error(f"Database initialization failed: {str(e)}")
        raise