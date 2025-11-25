"""
Database setup and session management
"""
import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from pathlib import Path

# Использовать DATABASE_URL из окружения (Railway предоставит)
DATABASE_URL = os.getenv("DATABASE_URL")

# Для локальной разработки используйте SQLite
if not DATABASE_URL:
    DATABASE_DIR = Path(__file__).parent
    DATABASE_URL = f"sqlite:///{DATABASE_DIR / 'finanzszenarien.db'}"

# PostgreSQL URL может быть в формате postgresql://, нужно заменить
if DATABASE_URL and DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+psycopg2://", 1)

# Создать engine с улучшенными настройками для Render/PostgreSQL
if DATABASE_URL.startswith("sqlite"):
    engine = create_engine(
        DATABASE_URL,
        connect_args={"check_same_thread": False}
    )
else:
    # Для PostgreSQL на Render: улучшенные настройки пула соединений
    engine = create_engine(
        DATABASE_URL,
        pool_pre_ping=True,  # Проверка соединения перед использованием
        pool_size=5,  # Количество соединений в пуле
        max_overflow=10,  # Дополнительные соединения при нагрузке
        pool_recycle=3600,  # Переиспользование соединений каждый час
        echo=False  # Отключить SQL логирование в продакшене
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

