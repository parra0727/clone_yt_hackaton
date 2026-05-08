import os
import uuid
from pathlib import Path

from fastapi import HTTPException, UploadFile

from app.core.redis_client import redis_client
from app.models.video import Video
from app.repositories.interfaces import UserRepositoryPort, VideoRepositoryPort

VIEW_BUFFER_THRESHOLD = int(os.getenv("VIEW_BUFFER_THRESHOLD", "10"))


class VideoService:
    def __init__(self, repo: VideoRepositoryPort, user_repo: UserRepositoryPort):
        self.repo = repo
        self.user_repo = user_repo

    def list_videos(self) -> list[Video]:
        return self.repo.get_all()

    def list_videos_paginated(self, offset: int = 0, limit: int = 20) -> list[Video]:
        return self.repo.get_all_paginated(offset=offset, limit=limit)

    def get_video(self, video_id: int) -> Video:
        video = self.repo.get_by_id(video_id)
        if not video:
            raise HTTPException(status_code=404, detail="Video not found")
        return video

    def upload_video(
        self,
        title: str,
        description: str,
        file: UploadFile,
        upload_dir: Path,
        thumbnail: UploadFile | None = None,
        uploader_id: int | None = None,
    ) -> Video:
        if uploader_id is not None and self.user_repo.get_by_id(uploader_id) is None:
            raise HTTPException(status_code=404, detail="Uploader not found")

        upload_dir.mkdir(parents=True, exist_ok=True)

        video_path = self._save_upload_file(file=file, directory=upload_dir, default_name="video.mp4")

        thumbnail_path: str | None = None
        if thumbnail:
            if thumbnail.content_type and not thumbnail.content_type.startswith("image/"):
                raise HTTPException(status_code=400, detail="Thumbnail must be an image")
            thumbnail_dir = upload_dir / "thumbnails"
            thumbnail_dir.mkdir(parents=True, exist_ok=True)
            thumbnail_path = self._save_upload_file(file=thumbnail, directory=thumbnail_dir, default_name="thumb.jpg")

        return self.repo.create(
            title=title,
            description=description,
            file_path=video_path,
            thumbnail_path=thumbnail_path,
            uploader_id=uploader_id,
        )

    def get_recommended(self, video_id: int, limit: int = 8) -> list[Video]:
        self.get_video(video_id)  # valida que existe
        return self.repo.get_recommended(video_id=video_id, limit=limit)

    def increment_views(self, video_id: int) -> Video:
        video = self.get_video(video_id)
        key = f"views:buffer:{video_id}"
        count = redis_client.incr(key)
        if count >= VIEW_BUFFER_THRESHOLD:
            buffered = redis_client.getdel(key)
            if buffered:
                self.repo.flush_views(video_id=video_id, count=int(buffered))
        return self.repo.get_by_id(video_id)

    def delete_video(self, video_id: int, requester_user_id: int) -> None:
        if self.user_repo.get_by_id(requester_user_id) is None:
            raise HTTPException(status_code=404, detail="User not found")

        video = self.get_video(video_id)
        if video.uploader_id is None or video.uploader_id != requester_user_id:
            raise HTTPException(status_code=403, detail="Only the video owner can delete this video")

        file_paths = [video.file_path]
        if video.thumbnail_path:
            file_paths.append(video.thumbnail_path)

        self.repo.delete(video)

        for file_path in file_paths:
            if os.path.exists(file_path):
                os.remove(file_path)

    def ensure_video_file_exists(self, video: Video) -> str:
        if not os.path.exists(video.file_path):
            raise HTTPException(status_code=404, detail="Video file not found")
        return video.file_path

    def ensure_thumbnail_file_exists(self, video: Video) -> str:
        if not video.thumbnail_path or not os.path.exists(video.thumbnail_path):
            raise HTTPException(status_code=404, detail="Thumbnail not found")
        return video.thumbnail_path

    def _save_upload_file(self, file: UploadFile, directory: Path, default_name: str) -> str:
        suffix = Path(file.filename or default_name).suffix or Path(default_name).suffix
        filename = f"{uuid.uuid4()}{suffix}"
        destination = directory / filename

        with destination.open("wb") as buffer:
            buffer.write(file.file.read())

        return str(destination)
