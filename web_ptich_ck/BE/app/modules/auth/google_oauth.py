"""Google OAuth 2.0 — build auth URL and exchange authorization code."""

import logging
from urllib.parse import urlencode

import httpx

from app.core.config import get_settings

logger = logging.getLogger(__name__)

GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo"


def get_google_auth_url() -> str:
    """Build the redirect URL to Google consent screen."""
    settings = get_settings()
    params = {
        "client_id": settings.GOOGLE_CLIENT_ID,
        "redirect_uri": settings.GOOGLE_REDIRECT_URI,
        "response_type": "code",
        "scope": "openid email profile",
        "access_type": "offline",
        "prompt": "consent",
    }
    return f"{GOOGLE_AUTH_URL}?{urlencode(params)}"


async def exchange_code_for_user(code: str) -> dict | None:
    """
    Exchange Google authorization code for user info.

    Returns dict with keys: sub, email, name, picture
    or None on failure.
    """
    settings = get_settings()

    async with httpx.AsyncClient(timeout=10.0) as client:
        # Step 1: exchange code → tokens
        token_resp = await client.post(
            GOOGLE_TOKEN_URL,
            data={
                "code": code,
                "client_id": settings.GOOGLE_CLIENT_ID,
                "client_secret": settings.GOOGLE_CLIENT_SECRET,
                "redirect_uri": settings.GOOGLE_REDIRECT_URI,
                "grant_type": "authorization_code",
            },
        )

        if token_resp.status_code != 200:
            logger.error("Google token exchange failed: %s", token_resp.text)
            return None

        tokens = token_resp.json()
        access_token = tokens.get("access_token")
        if not access_token:
            logger.error("No access_token in Google response")
            return None

        # Step 2: fetch user info
        userinfo_resp = await client.get(
            GOOGLE_USERINFO_URL,
            headers={"Authorization": f"Bearer {access_token}"},
        )

        if userinfo_resp.status_code != 200:
            logger.error("Google userinfo fetch failed: %s", userinfo_resp.text)
            return None

        return userinfo_resp.json()
