"""FastAPI dependencies — JWT authentication & role-based authorization."""

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.database import get_db
from app.modules.auth.logic import get_user_by_id
from app.modules.auth.security import decode_token

bearer_scheme = HTTPBearer(auto_error=True)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_db),
):
    """
    Decode JWT access token → lấy user từ DB.
    Dùng: Depends(get_current_user) trong protected routes.
    """
    try:
        payload = decode_token(credentials.credentials)
        if payload.get("type") != "access":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token type",
            )
        user_id = int(payload["sub"])
    except (JWTError, KeyError, ValueError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token invalid or expired",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = await get_user_by_id(db, user_id)
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive",
        )
    return user


def require_role(*roles: str):
    """
    Factory dependency: chỉ cho phép user có role phù hợp.

    Ví dụ:
        @router.get("/admin/users", dependencies=[Depends(require_role("admin"))])
        @router.get("/mod", dependencies=[Depends(require_role("admin", "moderator"))])
    """

    async def role_checker(user=Depends(get_current_user)):
        role_name = user.role.name if user.role else "user"
        if role_name not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Requires one of roles: {', '.join(roles)}",
            )
        return user

    return role_checker
