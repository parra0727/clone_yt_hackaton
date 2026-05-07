import { Link } from 'react-router-dom';

import { toAbsoluteApiUrl } from '../api/client';
import type { Video } from '../types';

type VideoCardProps = {
  video: Video;
};

function formatViews(views: number): string {
  if (views >= 1_000_000) return `${(views / 1_000_000).toFixed(1)}M views`;
  if (views >= 1_000) return `${(views / 1_000).toFixed(1)}K views`;
  return `${views} views`;
}

export function VideoCard({ video }: VideoCardProps) {
  const thumbnailSrc = video.thumbnail_url ? toAbsoluteApiUrl(video.thumbnail_url) : null;
  const avatarSrc = video.uploader?.avatar_url ? toAbsoluteApiUrl(video.uploader.avatar_url) : null;

  return (
    <Link to={`/watch/${video.id}`} className="video-card">
      <div className="video-thumb">
        {thumbnailSrc ? <img src={thumbnailSrc} alt={`${video.title} thumbnail`} loading="lazy" /> : null}
        <span className="video-duration">12:34</span>
      </div>
      <div className="video-meta">
        {avatarSrc ? <img className="channel-dot" src={avatarSrc} alt={`${video.uploader?.display_name ?? 'Uploader'} avatar`} loading="lazy" /> : <div className="channel-dot" />}
        <div>
          <h3 className="video-title">{video.title}</h3>
          <small className="video-channel">{video.uploader?.display_name ?? 'Unknown creator'}</small>
          <p className="video-description">{video.description || 'No description'}</p>
          <small className="video-stats">{formatViews(video.views)}</small>
        </div>
      </div>
    </Link>
  );
}
