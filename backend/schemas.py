"""
Pydantic schemas for request/response validation
"""
from pydantic import BaseModel, field_validator
from typing import Optional, Dict
import re


class UserRegister(BaseModel):
    """Schema for user registration"""
    email: str
    password: str
    full_name: Optional[str] = None

    @field_validator('email')
    @classmethod
    def validate_email(cls, v: str) -> str:
        email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        if not re.match(email_pattern, v):
            raise ValueError('Invalid email format')
        return v.lower()


class UserLogin(BaseModel):
    """Schema for user login"""
    email: str
    password: str

    @field_validator('email')
    @classmethod
    def validate_email(cls, v: str) -> str:
        email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        if not re.match(email_pattern, v):
            raise ValueError('Invalid email format')
        return v.lower()


class Token(BaseModel):
    """Schema for JWT token response"""
    access_token: str
    token_type: str = "bearer"
    user_id: int
    email: str
    full_name: Optional[str] = None


class UserResponse(BaseModel):
    """Schema for user information response"""
    id: int
    email: str
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None
    profession: Optional[str] = None
    about_me: Optional[str] = None
    financial_goals: Optional[str] = None
    quiz_profile: Optional[Dict[str, str]] = None
    is_active: bool

    class Config:
        from_attributes = True


class UserUpdate(BaseModel):
    """Schema for updating user profile"""
    full_name: Optional[str] = None
    profession: Optional[str] = None
    about_me: Optional[str] = None
    financial_goals: Optional[str] = None
    quiz_profile: Optional[Dict[str, str]] = None


class QuizProfileUpdate(BaseModel):
    """Schema for quiz profile submissions"""
    quiz_profile: Dict[str, str]
    profession: Optional[str] = None


class AnalysisHistoryCreate(BaseModel):
    """Schema for creating analysis history"""
    title: str
    user_goal: Optional[str] = None
    analysis_data: dict  # Full analysis response


class AnalysisHistoryResponse(BaseModel):
    """Schema for analysis history response"""
    id: int
    title: str
    user_goal: Optional[str] = None
    created_at: str
    updated_at: Optional[str] = None

    class Config:
        from_attributes = True

