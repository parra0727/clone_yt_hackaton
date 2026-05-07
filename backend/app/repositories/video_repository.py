from sqlalchemy import desc, func, update
from sqlalchemy.orm import Session

from app.models.video import Video


class VideoRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_all(self) -> list[Video]:
        return self.db.query(Video).order_by(desc(Video.created_at)).all()

    def get_by_id(self, video_id: int) -> Video | None:
        return self.db.query(Video).filter(Video.id == video_id).first()

    def get_by_uploader_ids(self, uploader_ids: list[int]) -> list[Video]:
        if not uploader_ids:
            return []
        return (
            self.db.query(Video)
            .filter(Video.uploader_id.in_(uploader_ids))
            .order_by(desc(Video.created_at))
            .all()
        )

    def create(
        self,
        title: str,
        description: str,
        file_path: str,
        thumbnail_path: str | None = None,
        uploader_id: int | None = None,
    ) -> Video:
        video = Video(
            title=title,
            description=description,
            file_path=file_path,
            thumbnail_path=thumbnail_path,
            uploader_id=uploader_id,
        )
        self.db.add(video)
        self.db.commit()
        self.db.refresh(video)
        return video

    def increment_views(self, video: Video) -> Video:
        self.db.execute(
            update(Video)
            .where(Video.id == video.id)
            .values(views=Video.views + 1)
        )
        self.db.commit()
        self.db.refresh(video)
        return video

    def flush_views(self, video_id: int, count: int) -> None:
        self.db.execute(
            update(Video)
            .where(Video.id == video_id)
            .values(views=Video.views + count)
        )
        self.db.commit()

    def get_recommended(self, video_id: int, limit: int = 8) -> list[Video]:
        current = self.db.query(Video).filter(Video.id == video_id).first()
        if not current:
            return []
        return (
            self.db.query(Video)
            .filter(Video.id != video_id)
            .order_by(desc(Video.views))
            .limit(limit)
            .all()
        )

    def get_all_paginated(self, offset: int = 0, limit: int = 20) -> list[Video]:
        return (
            self.db.query(Video)
            .order_by(desc(Video.created_at))
            .offset(offset)
            .limit(limit)
            .all()
        )

    def count_all(self) -> int:
        return self.db.query(func.count(Video.id)).scalar()

    def delete(self, video: Video) -> None:
        self.db.delete(video)
        self.db.commit()
