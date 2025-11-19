"""
Database models
"""
from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey, Text
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from database import Base


class User(Base):
    """User model for authentication"""
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String, nullable=True)
    avatar_url = Column(String, nullable=True)  # URL to avatar image
    profession = Column(String, nullable=True)  # User's profession
    about_me = Column(Text, nullable=True)  # Additional information about user
    financial_goals = Column(Text, nullable=True)  # User's financial goals
    quiz_profile = Column(Text, nullable=True)  # Serialized quiz answers / profile
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    analyses = relationship("AnalysisHistory", back_populates="user", cascade="all, delete-orphan")


class AnalysisHistory(Base):
    """Model for storing user analysis history"""
    __tablename__ = "analysis_history"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    title = Column(String, nullable=False)  # User goal or auto-generated title
    user_goal = Column(Text, nullable=True)  # Original user goal
    analysis_data = Column(Text, nullable=False)  # JSON string of analysis response
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    user = relationship("User", back_populates="analyses")

