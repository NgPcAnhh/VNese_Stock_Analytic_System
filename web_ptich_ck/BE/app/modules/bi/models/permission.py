import uuid
from datetime import datetime
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import BigInteger, ForeignKey, UniqueConstraint
from sqlalchemy import Uuid as UUID
from sqlalchemy.sql import func
from app.database.database import Base


class ChartPermission(Base):
    """bi_hub.chart_permissions — Phân quyền user được xem chart.
    
    Logic:
    - Nếu chart chưa có entry nào → chỉ admin và người tạo (created_by) được xem.
    - Nếu chart có entries → chỉ users trong danh sách (+ admin) được xem.
    """

    __tablename__ = "chart_permissions"
    __table_args__ = (
        UniqueConstraint("chart_id", "user_id", name="uq_chart_permission"),
        {"schema": "bi_hub"},
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    chart_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("bi_hub.charts.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    user_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("system.users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
    created_by: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
