import json
import mimetypes
import os
import re
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, Query, Request, UploadFile
from fastapi.responses import FileResponse, StreamingResponse

from app.api.response_mappers import to_video_response
from app.core.cache import invalidate_cache
from app.core.redis_client import redis_client
from app.dependencies import get_comment_service, get_video_service
from app.schemas.comment import CommentCreate, CommentResponse
from app.schemas.video import VideoResponse
from app.services.interfaces import CommentServicePort, VideoServicePort

router = APIRouter(prefix="/videos", tags=["videos"])
UPLOAD_DIR = Path("uploads")
CACHE_TTL = 30  # segundos


@router.get("", response_model=list[VideoResponse])
def get_videos(
    offset: int = Query(default=0, ge=0),
    limit: int = Query(default=20, ge=1, le=100),
    video_service: VideoServicePort = Depends(get_video_service),
):
    cache_key = f"videos:list:{offset}:{limit}"
    try:
        cached = redis_client.get(cache_key)
        if cached:
            return json.loads(cached)
    except Exception:
        pass

    videos = video_service.list_videos_paginated(offset=offset, limit=limit)
    result = [to_video_response(v) for v in videos]

    try:
        redis_client.setex(cache_key, CACHE_TTL, json.dumps(result, default=str))
    except Exception:
        pass

    return result


@router.post("/upload", response_model=VideoResponse)
def upload_video(
    title: str = Form(...),
    description: str = Form(""),
    file: UploadFile = File(...),
    thumbnail: UploadFile | None = File(None),
    uploader_id: int | None = Form(None),
    video_service: VideoServicePort = Depends(get_video_service),
):
    video = video_service.upload_video(
        title=title,
        description=description,
        file=file,
        upload_dir=UPLOAD_DIR,
        thumbnail=thumbnail,
        uploader_id=uploader_id,
    )
    invalidate_cache("videos:list:*")
    return to_video_response(video)


@router.get("/{video_id}", response_model=VideoResponse)
def get_video(
    video_id: int,
    video_service: VideoServicePort = Depends(get_video_service),
):
    cache_key = f"videos:detail:{video_id}"
    try:
        cached = redis_client.get(cache_key)
        if cached:
            redis_client.incr(f"views:buffer:{video_id}")
            return json.loads(cached)
    except Exception:
        pass

    video = video_service.increment_views(video_id)
    result = to_video_response(video)

    try:
        redis_client.setex(cache_key, CACHE_TTL, json.dumps(result, default=str))
    except Exception:
        pass

    return result


@router.delete("/{video_id}")
def delete_video(
    video_id: int,
    requester_user_id: int = Query(...),
    video_service: VideoServicePort = Depends(get_video_service),
):
    video_service.delete_video(video_id=video_id, requester_user_id=requester_user_id)
    invalidate_cache(f"videos:detail:{video_id}")
    invalidate_cache("videos:list:*")
    return {"status": "ok"}


@router.get("/{video_id}/stream")
def stream_video(
    video_id: int,
    request: Request,
    video_service: VideoServicePort = Depends(get_video_service),
):
    video = video_service.get_video(video_id)
    file_path = video_service.ensure_video_file_exists(video)
    file_size = os.path.getsize(file_path)
    range_header = request.headers.get("Range")

    if range_header:
        match = re.match(r"bytes=(\d+)-(\d*)", range_header)
        if match:
            start = int(match.group(1))
            end = int(match.group(2)) if match.group(2) else file_size - 1
            end = min(end, file_size - 1)
            chunk_size = end - start + 1

            def iterfile():
                with open(file_path, "rb") as f:
                    f.seek(start)
                    remaining = chunk_size
                    while remaining > 0:
                        data = f.read(min(65536, remaining))
                        if not data:
                            break
                        remaining -= len(data)
                        yield data

            return StreamingResponse(
                iterfile(),
                status_code=206,
                media_type="video/mp4",
                headers={
                    "Content-Range": f"bytes {start}-{end}/{file_size}",
                    "Accept-Ranges": "bytes",
                    "Content-Length": str(chunk_size),
                    "Cache-Control": "no-cache",
                },
            )

    def iterfile_full():
        with open(file_path, "rb") as f:
            while chunk := f.read(65536):
                yield chunk

    return StreamingResponse(
        iterfile_full(),
        media_type="video/mp4",
        headers={
            "Accept-Ranges": "bytes",
            "Content-Length": str(file_size),
        },
    )


@router.get("/{video_id}/thumbnail")
def stream_thumbnail(
    video_id: int,
    video_service: VideoServicePort = Depends(get_video_service),
):
    video = video_service.get_video(video_id)
    file_path = video_service.ensure_thumbnail_file_exists(video)
    media_type = mimetypes.guess_type(file_path)[0] or "image/jpeg"
    return FileResponse(
        file_path,
        media_type=media_type,
        filename=Path(file_path).name,
        headers={"Cache-Control": "public, max-age=3600"},
    )


@router.get("/{video_id}/comments", response_model=list[CommentResponse])
def get_comments(
    video_id: int,
    comment_service: CommentServicePort = Depends(get_comment_service),
):
    cache_key = f"videos:comments:{video_id}"
    try:
        cached = redis_client.get(cache_key)
        if cached:
            return json.loads(cached)
    except Exception:
        pass

    comments = comment_service.list_comments(video_id)
    result = [c.__dict__ if hasattr(c, '__dict__') else c for c in comments]

    try:
        redis_client.setex(cache_key, 10, json.dumps(result, default=str))
    except Exception:
        pass

    return comment_service.list_comments(video_id)


@router.post("/{video_id}/comments", response_model=CommentResponse)
def post_comment(
    video_id: int,
    payload: CommentCreate,
    comment_service: CommentServicePort = Depends(get_comment_service),
):
    comment = comment_service.create_comment(
        video_id=video_id,
        author=payload.author,
        content=payload.content,
    )
    invalidate_cache(f"videos:comments:{video_id}")
    return comment


@router.get("/{video_id}/recommended", response_model=list[VideoResponse])
def get_recommended(
    video_id: int,
    video_service: VideoServicePort = Depends(get_video_service),
):
    cache_key = f"videos:recommended:{video_id}"
    try:
        cached = redis_client.get(cache_key)
        if cached:
            return json.loads(cached)
    except Exception:
        pass

    videos = video_service.get_recommended(video_id)
    result = [to_video_response(v) for v in videos]

    try:
        redis_client.setex(cache_key, 60, json.dumps(result, default=str))
    except Exception:
        pass

    return result
