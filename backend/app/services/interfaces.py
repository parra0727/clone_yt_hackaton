from pathlib import Path
from typing import Protocol

from fastapi import UploadFile

from app.models.comment import Comment
from app.models.subscription import Subscription
from app.models.user import User
from app.models.video import Video


class VideoServicePort(Protocol):
    def list_videos(self) -> list[Video]: ...

    def get_video(self, video_id: int) -> Video: ...

    def upload_video(
        self,
        title: str,
        description: str,
        file: UploadFile,
        upload_dir: Path,
        thumbnail: UploadFile | None = None,
        uploader_id: int | None = None,
    ) -> Video: ...

    def get_recommended(self, video_id: int, limit: int = 8) -> list[Video]: ...

    def list_videos_paginated(self, offset: int = 0, limit: int = 20) -> list[Video]: ...

    def increment_views(self, video_id: int) -> Video: ...

    def delete_video(self, video_id: int, requester_user_id: int) -> None: ...

    def ensure_video_file_exists(self, video: Video) -> str: ...

    def ensure_thumbnail_file_exists(self, video: Video) -> str: ...


class CommentServicePort(Protocol):
    def list_comments(self, video_id: int) -> list[Comment]: ...

    def create_comment(self, video_id: int, author: str, content: str) -> Comment: ...


class UserServicePort(Protocol):
    def list_users(self) -> list[User]: ...

    def get_user(self, user_id: int) -> User: ...

    def create_user(
        self,
        provider_name: str,
        display_name: str,
        provider_subject: str,
        email: str | None,
        avatar: UploadFile | None,
        upload_dir: Path,
    ) -> User: ...

    def ensure_avatar_file_exists(self, user: User) -> str: ...

    def list_providers(self) -> list[str]: ...


class SubscriptionServicePort(Protocol):
    def subscribe(self, follower_id: int, creator_id: int) -> Subscription: ...

    def unsubscribe(self, follower_id: int, creator_id: int) -> None: ...

    def list_subscription_creator_ids(self, follower_id: int) -> list[int]: ...

    def get_subscription_feed(self, follower_id: int) -> list[Video]: ...
