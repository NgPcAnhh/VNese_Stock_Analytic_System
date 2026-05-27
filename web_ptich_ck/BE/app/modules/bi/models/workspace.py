from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import String
from app.modules.bi.models.base import BIBaseModel

class Workspace(BIBaseModel):
    __tablename__ = "workspaces"
    __table_args__ = {"schema": "bi_hub"}

    name: Mapped[str] = mapped_column(String, nullable=False)
    slug: Mapped[str] = mapped_column(String, nullable=False, unique=True)
    
    data_sources = relationship("DataSource", back_populates="workspace")
