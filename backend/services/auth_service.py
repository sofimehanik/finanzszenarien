"""
Authentication service for user registration and login
"""
from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
import bcrypt
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from models import User
import os

# JWT settings
SECRET_KEY = os.getenv("JWT_SECRET_KEY", "your-secret-key-change-in-production-min-32-chars")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30 * 24 * 60  # 30 days

# Bcrypt settings
BCRYPT_ROUNDS = 12


class AuthService:
    """Service for handling authentication operations"""

    @staticmethod
    def verify_password(plain_password: str, hashed_password: str) -> bool:
        """Verify a password against its hash"""
        # Truncate password to 72 bytes for bcrypt compatibility
        password_bytes = plain_password.encode('utf-8')
        if len(password_bytes) > 72:
            truncated_bytes = password_bytes[:72]
            # Remove incomplete UTF-8 sequences
            while truncated_bytes and (truncated_bytes[-1] & 0xC0) == 0x80:
                truncated_bytes = truncated_bytes[:-1]
            plain_password = truncated_bytes.decode('utf-8', errors='ignore')
        
        try:
            return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))
        except Exception:
            return False

    @staticmethod
    def get_password_hash(password: str) -> str:
        """Hash a password using bcrypt directly"""
        # Bcrypt has a 72 byte limit - ensure password is within limit
        # Convert to bytes to check actual byte length (not character length)
        password_bytes = password.encode('utf-8')
        
        # If password is too long, truncate safely
        if len(password_bytes) > 72:
            # Take first 72 bytes
            truncated_bytes = password_bytes[:72]
            # Remove any incomplete UTF-8 sequences at the end
            # UTF-8 continuation bytes start with 10xxxxxx (0x80-0xBF)
            # We need to remove them if they're at the end
            while truncated_bytes and (truncated_bytes[-1] & 0xC0) == 0x80:
                truncated_bytes = truncated_bytes[:-1]
            password_bytes = truncated_bytes
        
        # Hash the password using bcrypt directly
        try:
            salt = bcrypt.gensalt(rounds=BCRYPT_ROUNDS)
            hashed = bcrypt.hashpw(password_bytes, salt)
            return hashed.decode('utf-8')
        except Exception as e:
            error_msg = str(e)
            raise ValueError(f"Password hashing failed: {error_msg}")

    @staticmethod
    def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
        """Create a JWT access token"""
        to_encode = data.copy()
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        to_encode.update({"exp": expire})
        encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
        return encoded_jwt

    @staticmethod
    def verify_token(token: str) -> Optional[dict]:
        """Verify and decode a JWT token"""
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            return payload
        except JWTError:
            return None
        except Exception:
            return None

    @staticmethod
    def register_user(db: Session, email: str, password: str, full_name: Optional[str] = None) -> User:
        """Register a new user"""
        # Check if user already exists
        existing_user = db.query(User).filter(User.email == email).first()
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )

        # Validate password
        if len(password) < 6:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Password must be at least 6 characters"
            )
        
        # Bcrypt has a 72 byte limit - ensure password is within limit before hashing
        # Convert to bytes to check actual byte length
        password_bytes = password.encode('utf-8')
        if len(password_bytes) > 72:
            # Truncate to 72 bytes safely (preserve UTF-8 character boundaries)
            truncated_bytes = password_bytes[:72]
            # Remove incomplete UTF-8 sequences at the end
            # UTF-8 continuation bytes have pattern 10xxxxxx (0x80-0xBF)
            while truncated_bytes and (truncated_bytes[-1] & 0xC0) == 0x80:
                truncated_bytes = truncated_bytes[:-1]
            password = truncated_bytes.decode('utf-8', errors='ignore')

        # Create new user - hash password
        try:
            hashed_password = AuthService.get_password_hash(password)
        except Exception as e:
            # If hashing fails, provide a clear error message
            error_msg = str(e)
            if "72 bytes" in error_msg.lower() or "cannot be longer" in error_msg.lower():
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Password is too long. Please use a password with 72 characters or less."
                )
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Password hashing failed: {error_msg}"
            )
        new_user = User(
            email=email,
            hashed_password=hashed_password,
            full_name=full_name,
            is_active=True
        )
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        return new_user

    @staticmethod
    def authenticate_user(db: Session, email: str, password: str) -> Optional[User]:
        """Authenticate a user and return User object if valid"""
        user = db.query(User).filter(User.email == email).first()
        if not user:
            return None
        # Truncate password to 72 bytes for bcrypt compatibility
        password_bytes = password.encode('utf-8')
        if len(password_bytes) > 72:
            password = password_bytes[:72].decode('utf-8', errors='ignore')
        if not AuthService.verify_password(password, user.hashed_password):
            return None
        if not user.is_active:
            return None
        return user

    @staticmethod
    def get_user_by_id(db: Session, user_id: int) -> Optional[User]:
        """Get user by ID"""
        return db.query(User).filter(User.id == user_id).first()

    @staticmethod
    def get_user_by_email(db: Session, email: str) -> Optional[User]:
        """Get user by email"""
        return db.query(User).filter(User.email == email).first()

