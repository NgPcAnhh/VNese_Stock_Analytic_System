import uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import String, ForeignKey
from sqlalchemy import Uuid as UUID
from app.modules.bi.models.base import BIBaseModel

class DatasetFolder(BIBaseModel):
    __tablename__ = "dataset_folders"
    __table_args__ = {"schema": "bi_hub"}

    workspace_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("bi_hub.workspaces.id"), nullable=False)
    name: Mapped[str] = mapped_column(String, nullable=False)
    parent_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("bi_hub.dataset_folders.id", ondelete="CASCADE"), nullable=True
    )

    parent = relationship("DatasetFolder", remote_side="[DatasetFolder.id]", backref="children")
