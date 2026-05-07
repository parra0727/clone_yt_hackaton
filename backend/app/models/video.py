from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Index, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Video(Base):
    __tablename__ = "videos"
    __table_args__ = (
        Index("ix_videos_uploader_created", "uploader_id", "created_at"),
        Index("ix_videos_views", "views"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    title: Mapped[str] = mapped_column(String(500), nullable=False, index=True)
    description: Mapped[str] = mapped_column(Text, default="")
    file_path: Mapped[str] = mapped_column(String(1000), nullable=False)
    thumbnail_path: Mapped[str | None] = mapped_column(String(500), nullable=True)
    uploader_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True, index=True)
    views: Mapped[int] = mapped_column(Integer, default=0, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)

    uploader = relationship("User", back_populates="uploaded_videos")
    comments = relationship("Comment", back_populates="video", cascade="all, delete-orphan")
