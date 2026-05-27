import uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import String, ForeignKey, Text
from sqlalchemy import JSON, Uuid as UUID
from app.modules.bi.models.base import BIBaseModel

class Chart(BIBaseModel):
    __tablename__ = "charts"
    __table_args__ = {"schema": "bi_hub"}

    workspace_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("bi_hub.workspaces.id"), nullable=False)
    dataset_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("bi_hub.datasets.id"), nullable=False)
    name: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=True)
    chart_type: Mapped[str] = mapped_column(String, nullable=False)
    encodings: Mapped[dict] = mapped_column(JSON, nullable=False, default={})
    echarts_option: Mapped[dict] = mapped_column(JSON, nullable=False, default={})
    transform_config: Mapped[dict] = mapped_column(JSON, nullable=True, default={})
    created_by: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=True)

    dataset = relationship("Dataset")
