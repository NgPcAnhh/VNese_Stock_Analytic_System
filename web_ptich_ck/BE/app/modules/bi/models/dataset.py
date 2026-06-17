import uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import String, Integer, ForeignKey, Text
from sqlalchemy import JSON, Uuid as UUID
from app.modules.bi.models.base import BIBaseModel

class Dataset(BIBaseModel):
    __tablename__ = "datasets"
    __table_args__ = {"schema": "bi_hub"}

    workspace_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("bi_hub.workspaces.id"), nullable=False)
    query_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("bi_hub.queries.id"), nullable=True)
    data_source_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("bi_hub.data_sources.id"), nullable=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=True)
    columns_schema: Mapped[dict] = mapped_column(JSON, nullable=False, default=[])
    refresh_mode: Mapped[str] = mapped_column(String, nullable=False, default='live')
    cache_ttl_seconds: Mapped[int] = mapped_column(Integer, nullable=True, default=300)
    created_by: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=True)
    folder_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("bi_hub.dataset_folders.id", ondelete="SET NULL"), nullable=True)

    query = relationship("Query")
    data_source = relationship("DataSource")
    folder = relationship("DatasetFolder")

