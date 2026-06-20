"""SQLAlchemy ORM models for Chatbot — mapped to schema `system`."""

from datetime import datetime
import uuid
from sqlalchemy import (
    BigInteger,
    ForeignKey,
    String,
    Text,
    DateTime,
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.database import Base


class ChatSession(Base):
    """system.chat_sessions — Phiên chat của người dùng."""

    __tablename__ = "chat_sessions"
    __table_args__ = {"schema": "system"}

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[int | None] = mapped_column(
        BigInteger, ForeignKey("system.users.id", ondelete="CASCADE"), nullable=True
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False, default="Cuộc hội thoại mới")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow
    )

    messages: Mapped[list["ChatMessage"]] = relationship(
        "ChatMessage", back_populates="session", cascade="all, delete-orphan", order_by="ChatMessage.created_at.asc()"
    )


class ChatMessage(Base):
    """system.chat_messages — Lịch sử tin nhắn trong phiên chat."""

    __tablename__ = "chat_messages"
    __table_args__ = {"schema": "system"}

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    session_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("system.chat_sessions.id", ondelete="CASCADE"), nullable=False
    )
    role: Mapped[str] = mapped_column(String(20), nullable=False)  # 'user' or 'assistant'
    content: Mapped[str] = mapped_column(Text, nullable=False)
    meta: Mapped[dict | None] = mapped_column(JSONB, nullable=True)  # citations, sql_used, data_tables, etc.
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow
    )

    session: Mapped["ChatSession"] = relationship("ChatSession", back_populates="messages")
