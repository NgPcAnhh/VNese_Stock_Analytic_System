"""Email service — gửi email reset password qua SMTP."""

import asyncio
import logging
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from app.core.config import get_settings

logger = logging.getLogger(__name__)


def _build_reset_email(to_email: str, reset_token: str) -> MIMEMultipart:
    """Build the reset-password email message."""
    settings = get_settings()
    reset_link = f"{settings.FRONTEND_URL}/reset-password?token={reset_token}"

    msg = MIMEMultipart("alternative")
    msg["Subject"] = "Đặt lại mật khẩu — Stock Analysis"
    msg["From"] = settings.EMAIL_FROM
    msg["To"] = to_email

    html = f"""\
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #1a73e8;">Đặt lại mật khẩu</h2>
        <p>Bạn đã yêu cầu đặt lại mật khẩu cho tài khoản <strong>{to_email}</strong>.</p>
        <p>Click nút bên dưới để tiếp tục (link có hiệu lực <strong>15 phút</strong>):</p>
        <p style="text-align: center; margin: 24px 0;">
            <a href="{reset_link}"
               style="background: #1a73e8; color: #fff; padding: 12px 32px;
                      border-radius: 6px; text-decoration: none; font-weight: bold;">
                Đặt lại mật khẩu
            </a>
        </p>
        <p style="color: #666; font-size: 13px;">
            Nếu bạn không yêu cầu, hãy bỏ qua email này. Tài khoản của bạn vẫn an toàn.
        </p>
    </div>
    """
    msg.attach(MIMEText(html, "html"))
    return msg


async def send_reset_email(to_email: str, reset_token: str) -> bool:
    """
    Gửi email reset password.
    Chạy SMTP trong thread pool để không block event loop.
    """
    settings = get_settings()

    def _send():
        try:
            msg = _build_reset_email(to_email, reset_token)
            with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
                server.starttls()
                server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                server.sendmail(settings.EMAIL_FROM, to_email, msg.as_string())
            return True
        except Exception:
            logger.exception("Failed to send reset email to %s", to_email)
            return False

    return await asyncio.get_running_loop().run_in_executor(None, _send)
