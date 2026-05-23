"""Pydantic schemas for Auth module — request / response validation."""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, Field


# ── Request schemas ────────────────────────────────────────────────


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)
    full_name: str = Field(..., min_length=2, max_length=255)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=1, max_length=128)


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str = Field(..., min_length=8, max_length=128)


class UpdateProfileRequest(BaseModel):
    full_name: Optional[str] = Field(None, min_length=2, max_length=255)
    avatar_url: Optional[str] = None


class ChangePasswordRequest(BaseModel):
    old_password: str = Field(..., min_length=1, max_length=128)
    new_password: str = Field(..., min_length=8, max_length=128)


class Verify2FARequest(BaseModel):
    otp: str = Field(..., min_length=6, max_length=6)


class Login2FARequest(BaseModel):
    temp_token: str
    otp: str = Field(..., min_length=6, max_length=6)


class Disable2FARequest(BaseModel):
    otp: str = Field(..., min_length=6, max_length=6)


# ── Response schemas ───────────────────────────────────────────────


class UserResponse(BaseModel):
    id: int
    email: str
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None
    role: str
    auth_provider: str
    is_verified: bool
    is_totp_enabled: bool = False
    created_at: datetime

    model_config = {"from_attributes": True}


class AuthResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int = Field(..., description="Access token TTL in seconds")
    user: UserResponse


class TwoFactorRequiredResponse(BaseModel):
    status: str = "requires_2fa"
    temp_token: str
    message: str = "Vui lòng nhập mã OTP từ ứng dụng xác thực"


class Setup2FAResponse(BaseModel):
    secret: str
    provisioning_uri: str
    qr_code_base64: str


class MessageResponse(BaseModel):
    success: bool = True
    message: str = "OK"
