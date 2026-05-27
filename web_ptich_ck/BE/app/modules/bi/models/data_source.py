import uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import String, Integer, ForeignKey
from sqlalchemy import JSON, Uuid as UUID
from app.modules.bi.models.base import BIBaseModel

class DataSource(BIBaseModel):
    __tablename__ = "data_sources"
    __table_args__ = {"schema": "bi_hub"}

    workspace_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("bi_hub.workspaces.id"), nullable=False)
    name: Mapped[str] = mapped_column(String, nullable=False)
    type: Mapped[str] = mapped_column(String, nullable=False) # 'postgres', 'mysql', etc.
    host: Mapped[str] = mapped_column(String, nullable=True)
    port: Mapped[int] = mapped_column(Integer, nullable=True)
    database_name: Mapped[str] = mapped_column(String, nullable=True)
    username: Mapped[str] = mapped_column(String, nullable=True)
    encrypted_password: Mapped[str] = mapped_column(String, nullable=True)
    ssl_config: Mapped[dict] = mapped_column(JSON, nullable=True)
    extra_config: Mapped[dict] = mapped_column(JSON, nullable=True)
    created_by: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=True)

    workspace = relationship("Workspace", back_populates="data_sources")
