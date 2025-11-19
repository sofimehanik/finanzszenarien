"""
Database setup and session management
"""
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from pathlib import Path

# SQLite database path
DATABASE_DIR = Path(__file__).parent
DATABASE_URL = f"sqlite:///{DATABASE_DIR / 'finanzszenarien.db'}"

# Create engine
engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False}  # Needed for SQLite
)

# Create session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for models
Base = declarative_base()


def get_db():
    """Dependency for getting database session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Initialize database - create all tables and add missing columns"""
    Base.metadata.create_all(bind=engine)
    
    # Add missing columns for existing tables (for migrations)
    from sqlalchemy import inspect, text
    inspector = inspect(engine)
    
    if 'users' in inspector.get_table_names():
        columns = [col['name'] for col in inspector.get_columns('users')]
        if 'avatar_url' not in columns:
            with engine.connect() as conn:
                conn.execute(text("ALTER TABLE users ADD COLUMN avatar_url VARCHAR"))
                conn.commit()
            print("✅ Added avatar_url column to users table")
        if 'profession' not in columns:
            with engine.connect() as conn:
                conn.execute(text("ALTER TABLE users ADD COLUMN profession VARCHAR"))
                conn.commit()
            print("✅ Added profession column to users table")
        if 'about_me' not in columns:
            with engine.connect() as conn:
                conn.execute(text("ALTER TABLE users ADD COLUMN about_me TEXT"))
                conn.commit()
            print("✅ Added about_me column to users table")
        if 'financial_goals' not in columns:
            with engine.connect() as conn:
                conn.execute(text("ALTER TABLE users ADD COLUMN financial_goals TEXT"))
                conn.commit()
            print("✅ Added financial_goals column to users table")
        if 'quiz_profile' not in columns:
            with engine.connect() as conn:
                conn.execute(text("ALTER TABLE users ADD COLUMN quiz_profile TEXT"))
                conn.commit()
            print("✅ Added quiz_profile column to users table")
    
    print("✅ Database initialized")

