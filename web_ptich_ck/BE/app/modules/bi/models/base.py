import uuid
from datetime import datetime
from sqlalchemy.orm import mapped_column, Mapped
from sqlalchemy import Uuid as UUID
from sqlalchemy.sql import func
from app.database.database import Base

class BIBaseModel(Base):
    __abstract__ = True

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(server_default=func.now(), onupdate=func.now())
