"""API Router for Auth module — register, login, Google OAuth, password reset, 2FA, change password."""

import logging

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.database.database import get_db
from app.modules.auth import logic
from app.modules.auth.dependencies import get_current_user
from app.modules.auth.email_service import send_reset_email
from app.modules.auth.schemas import (
    AuthResponse,
    ChangePasswordRequest,
    Disable2FARequest,
    ForgotPasswordRequest,
    Login2FARequest,
    LoginRequest,
    MessageResponse,
    RefreshTokenRequest,
    RegisterRequest,
    ResetPasswordRequest,
    Setup2FAResponse,
    TwoFactorRequiredResponse,
    UpdateProfileRequest,
    UserResponse,
    Verify2FARequest,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["Authentication"])

settings = get_settings()


def _client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


# ── 1. Register ───────────────────────────────────────────────────


@router.post("/register", response_model=AuthResponse, status_code=201)
async def register(body: RegisterRequest, db: AsyncSession = Depends(get_db)):
    """Đăng ký tài khoản mới bằng email + password."""
    result = await logic.register_user(
        db, email=body.email, password=body.password, full_name=body.full_name
    )
    if result is None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email đã được sử dụng",
        )
    return result


# ── 2. Login ──────────────────────────────────────────────────────


@router.post("/login")
async def login(body: LoginRequest, request: Request, db: AsyncSession = Depends(get_db)):
    """Đăng nhập bằng email + password. Trả về tokens hoặc yêu cầu 2FA."""
    from app.modules.tracking.logic import track_login as _track_login

    ip = _client_ip(request)
    device = request.headers.get("user-agent", "")

    result = await logic.authenticate_user(
        db,
        email=body.email,
        password=body.password,
        ip_address=ip,
        device_info=device,
    )

    # result là error string
    if isinstance(result, str):
        await _track_login(db, user_id=None, method="local", success=False,
                           ip_address=ip, device_info=device)
        error_map = {
            "invalid_credentials": (401, "Email hoặc mật khẩu không đúng"),
            "google_account": (400, "Tài khoản này sử dụng Google. Vui lòng đăng nhập bằng Google."),
            "account_disabled": (403, "Tài khoản đã bị khoá"),
        }
        code, msg = error_map.get(result, (401, "Lỗi xác thực"))
        raise HTTPException(status_code=code, detail=msg)

    # result là dict — có thể là AuthResponse hoặc TwoFactorRequiredResponse
    if isinstance(result, dict) and result.get("status") == "requires_2fa":
        return result  # { status, temp_token, message }

    return result


# ── 3. Login 2FA ─────────────────────────────────────────────────


@router.post("/login/2fa", response_model=AuthResponse)
async def login_2fa(body: Login2FARequest, request: Request, db: AsyncSession = Depends(get_db)):
    """Xác thực OTP sau khi login (bước 2 của 2FA)."""
    ip = _client_ip(request)
    device = request.headers.get("user-agent", "")

    result = await logic.verify_login_2fa(
        db,
        temp_token=body.temp_token,
        otp=body.otp,
        ip_address=ip,
        device_info=device,
    )
    if isinstance(result, str):
        error_map = {
            "invalid_token": (401, "Token không hợp lệ hoặc đã hết hạn"),
            "user_not_found": (401, "Người dùng không tồn tại"),
            "2fa_not_enabled": (400, "2FA chưa được bật"),
            "invalid_otp": (401, "Mã OTP không đúng"),
        }
        code, msg = error_map.get(result, (401, "Lỗi xác thực"))
        raise HTTPException(status_code=code, detail=msg)
    return result


# ── 4. Refresh Token ─────────────────────────────────────────────


@router.post("/refresh", response_model=AuthResponse)
async def refresh_token(body: RefreshTokenRequest, db: AsyncSession = Depends(get_db)):
    """Đổi refresh token lấy access token mới."""
    result = await logic.refresh_access_token(db, body.refresh_token)
    if isinstance(result, str):
        error_map = {
            "invalid_token": (401, "Refresh token không hợp lệ"),
            "token_expired": (401, "Refresh token đã hết hạn"),
            "user_not_found": (401, "Người dùng không tồn tại"),
        }
        code, msg = error_map.get(result, (401, "Lỗi xác thực"))
        raise HTTPException(status_code=code, detail=msg)
    return result


# ── 5. Logout ─────────────────────────────────────────────────────


@router.post("/logout", response_model=MessageResponse)
async def logout(body: RefreshTokenRequest, db: AsyncSession = Depends(get_db)):
    """Thu hồi refresh token (logout)."""
    revoked = await logic.revoke_refresh_token(db, body.refresh_token)
    if revoked:
        return MessageResponse(success=True, message="Đã đăng xuất")
    return MessageResponse(success=False, message="Token không tìm thấy")





# ── 7. Forgot Password ───────────────────────────────────────────


@router.post("/forgot-password", response_model=MessageResponse)
async def forgot_password(body: ForgotPasswordRequest, db: AsyncSession = Depends(get_db)):
    """
    Gửi email chứa link reset password.
    Luôn trả 200 dù email tồn tại hay không (tránh leak).
    """
    token = await logic.create_password_reset_token(db, body.email)
    if token:
        await send_reset_email(body.email, token)

    return MessageResponse(
        success=True,
        message="Nếu email tồn tại, bạn sẽ nhận được link đặt lại mật khẩu.",
    )


# ── 8. Reset Password ────────────────────────────────────────────


@router.post("/reset-password", response_model=MessageResponse)
async def reset_password(body: ResetPasswordRequest, db: AsyncSession = Depends(get_db)):
    """Verify token và đổi mật khẩu mới."""
    result = await logic.reset_password(db, token=body.token, new_password=body.new_password)

    if result == "success":
        return MessageResponse(success=True, message="Đã đổi mật khẩu thành công")

    error_map = {
        "invalid_token": (400, "Token không hợp lệ"),
        "token_expired": (400, "Token đã hết hạn"),
        "token_used": (400, "Token đã được sử dụng"),
    }
    code, msg = error_map.get(result, (400, "Lỗi đặt lại mật khẩu"))
    raise HTTPException(status_code=code, detail=msg)


# ── 9. Change Password (protected) ───────────────────────────────


@router.post("/change-password", response_model=MessageResponse)
async def change_password_endpoint(
    body: ChangePasswordRequest,
    user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Đổi mật khẩu cho user đã đăng nhập (cần JWT)."""
    result = await logic.change_password(
        db,
        user_id=user.id,
        old_password=body.old_password,
        new_password=body.new_password,
    )
    if result == "success":
        return MessageResponse(success=True, message="Đã đổi mật khẩu thành công. Vui lòng đăng nhập lại.")

    error_map = {
        "wrong_password": (400, "Mật khẩu hiện tại không đúng"),
        "google_account": (400, "Tài khoản Google không có mật khẩu. Vui lòng sử dụng đăng nhập Google."),
        "user_not_found": (404, "Không tìm thấy người dùng"),
    }
    code, msg = error_map.get(result, (400, "Lỗi đổi mật khẩu"))
    raise HTTPException(status_code=code, detail=msg)


# ── 10. Get Current User (protected) ─────────────────────────────


@router.get("/me", response_model=UserResponse)
async def get_me(user=Depends(get_current_user)):
    """Lấy thông tin user hiện tại (cần JWT)."""
    return UserResponse(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        avatar_url=user.avatar_url,
        role=user.role.name if user.role else "user",
        auth_provider=user.auth_provider,
        is_verified=user.is_verified,
        is_totp_enabled=user.is_totp_enabled,
        created_at=user.created_at,
    )


# ── 11. Update Profile (protected) ───────────────────────────────


@router.put("/me", response_model=UserResponse)
async def update_me(
    body: UpdateProfileRequest,
    user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Cập nhật profile (cần JWT)."""
    updated = await logic.update_user_profile(
        db,
        user_id=user.id,
        full_name=body.full_name,
        avatar_url=body.avatar_url,
    )
    if not updated:
        raise HTTPException(status_code=404, detail="User not found")

    return UserResponse(
        id=updated.id,
        email=updated.email,
        full_name=updated.full_name,
        avatar_url=updated.avatar_url,
        role=updated.role.name if updated.role else "user",
        auth_provider=updated.auth_provider,
        is_verified=updated.is_verified,
        is_totp_enabled=updated.is_totp_enabled,
        created_at=updated.created_at,
    )


# ── 12. 2FA Setup (protected) ────────────────────────────────────


@router.post("/2fa/setup", response_model=Setup2FAResponse)
async def setup_2fa(
    user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Tạo TOTP secret và QR code cho user (cần JWT)."""
    result = await logic.setup_totp(db, user_id=user.id)
    if isinstance(result, str):
        error_map = {
            "user_not_found": (404, "Không tìm thấy người dùng"),
            "already_enabled": (400, "2FA đã được bật. Tắt trước khi thiết lập lại."),
        }
        code, msg = error_map.get(result, (400, "Lỗi thiết lập 2FA"))
        raise HTTPException(status_code=code, detail=msg)
    return result


# ── 13. 2FA Enable (protected) ───────────────────────────────────


@router.post("/2fa/enable", response_model=MessageResponse)
async def enable_2fa(
    body: Verify2FARequest,
    user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Xác thực OTP và bật 2FA cho user (cần JWT)."""
    result = await logic.enable_totp(db, user_id=user.id, otp=body.otp)
    if result == "success":
        return MessageResponse(success=True, message="Đã bật xác thực 2 bước thành công")

    error_map = {
        "invalid_otp": (400, "Mã OTP không đúng. Vui lòng thử lại."),
        "no_secret": (400, "Chưa thiết lập 2FA. Vui lòng gọi /2fa/setup trước."),
        "already_enabled": (400, "2FA đã được bật."),
        "user_not_found": (404, "Không tìm thấy người dùng"),
    }
    code, msg = error_map.get(result, (400, "Lỗi bật 2FA"))
    raise HTTPException(status_code=code, detail=msg)


# ── 14. 2FA Disable (protected) ──────────────────────────────────


@router.post("/2fa/disable", response_model=MessageResponse)
async def disable_2fa(
    body: Disable2FARequest,
    user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Tắt 2FA cho user (cần JWT + OTP)."""
    result = await logic.disable_totp(db, user_id=user.id, otp=body.otp)
    if result == "success":
        return MessageResponse(success=True, message="Đã tắt xác thực 2 bước")

    error_map = {
        "invalid_otp": (400, "Mã OTP không đúng"),
        "not_enabled": (400, "2FA chưa được bật"),
        "user_not_found": (404, "Không tìm thấy người dùng"),
    }
    code, msg = error_map.get(result, (400, "Lỗi tắt 2FA"))
    raise HTTPException(status_code=code, detail=msg)
