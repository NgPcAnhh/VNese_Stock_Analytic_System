import uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import String, ForeignKey, Text, Integer
from sqlalchemy import JSON, Uuid as UUID
from datetime import datetime
from app.modules.bi.models.base import BIBaseModel

class Dashboard(BIBaseModel):
    __tablename__ = "dashboards"
    __table_args__ = {"schema": "bi_hub"}

    workspace_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("bi_hub.workspaces.id"), nullable=False)
    name: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String, nullable=False, default='draft')
    global_filters: Mapped[dict] = mapped_column(JSON, nullable=True, default=[])
    theme_config: Mapped[dict] = mapped_column(JSON, nullable=True, default={})
    widgets: Mapped[dict] = mapped_column(JSON, nullable=True, default=[])
    created_by: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=True)
    published_at: Mapped[datetime] = mapped_column(nullable=True)

    items = relationship("DashboardItem", back_populates="dashboard", cascade="all, delete-orphan")

class DashboardItem(BIBaseModel):
    __tablename__ = "dashboard_items"
    __table_args__ = {"schema": "bi_hub"}

    dashboard_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("bi_hub.dashboards.id", ondelete="CASCADE"), nullable=False)
    chart_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("bi_hub.charts.id"), nullable=False)
    x: Mapped[int] = mapped_column(Integer, nullable=False)
    y: Mapped[int] = mapped_column(Integer, nullable=False)
    w: Mapped[int] = mapped_column(Integer, nullable=False)
    h: Mapped[int] = mapped_column(Integer, nullable=False)
    config: Mapped[dict] = mapped_column(JSON, nullable=True, default={})

    dashboard = relationship("Dashboard", back_populates="items")
    chart = relationship("Chart")
