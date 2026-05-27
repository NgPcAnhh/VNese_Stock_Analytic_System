import uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import String, Integer, ForeignKey, Text
from sqlalchemy import JSON, Uuid as UUID
from app.modules.bi.models.base import BIBaseModel

class Query(BIBaseModel):
    __tablename__ = "queries"
    __table_args__ = {"schema": "bi_hub"}

    workspace_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("bi_hub.workspaces.id"), nullable=False)
    data_source_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("bi_hub.data_sources.id"), nullable=False)
    name: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=True)
    sql_text: Mapped[str] = mapped_column(Text, nullable=False)
    database_name: Mapped[str] = mapped_column(String, nullable=True)
    schema_name: Mapped[str] = mapped_column(String, nullable=True)
    parameters_schema: Mapped[dict] = mapped_column(JSON, nullable=True, default=[])
    version: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    status: Mapped[str] = mapped_column(String, nullable=False, default='active')
    created_by: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=True)

    data_source = relationship("DataSource")
