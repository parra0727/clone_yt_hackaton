import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { addComment, deleteVideo, fetchComments, fetchRecommended, fetchVideo, toAbsoluteApiUrl, toAbsoluteStreamUrl } from '../api/client';
import { useUserContext } from '../context/UserContext';
import { useVideoCache } from '../context/VideoCacheContext';

function formatViews(views: number): string {
  return `${views.toLocaleString()} views`;
}

export function WatchPage() {
  const { id } = useParams();
  const videoId = Number(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { refreshVideos } = useVideoCache();
  const { currentUser, isSubscribedTo, subscribe, unsubscribe } = useUserContext();
  const [author, setAuthor] = useState(currentUser?.display_name ?? '');
  const [content, setContent] = useState('');

  useEffect(() => {
    setAuthor(currentUser?.display_name ?? '');
  }, [currentUser?.id]);

  const videoQuery = useQuery({
    queryKey: ['video', videoId],
    queryFn: () => fetchVideo(videoId),
    enabled: Number.isFinite(videoId),
  });

  const commentsQuery = useQuery({
    queryKey: ['comments', videoId],
    queryFn: () => fetchComments(videoId),
    enabled: Number.isFinite(videoId),
  });

  const recommendedQuery = useQuery({
    queryKey: ['recommended', videoId],
    queryFn: () => fetchRecommended(videoId),
    enabled: Number.isFinite(videoId),
  });

  const commentMutation = useMutation({
    mutationFn: () => addComment(videoId, author, content),
    onSuccess: async () => {
      setAuthor(currentUser?.display_name ?? '');
      setContent('');
      await queryClient.invalidateQueries({ queryKey: ['comments', videoId] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!currentUser) throw new Error('Current user required');
      await deleteVideo(videoId, currentUser.id);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['video', videoId] });
      await refreshVideos();
      navigate('/');
    },
  });

  const streamSrc = useMemo(() => {
    if (!videoQuery.data) return '';
    return toAbsoluteStreamUrl(videoQuery.data.stream_url);
  }, [videoId, videoQuery.data]);

  const uploaderId = videoQuery.data?.uploader?.id ?? null;
  const showSubscribeButton =
    !!currentUser && uploaderId !== null && uploaderId !== currentUser.id;
  const isOwner = !!currentUser && uploaderId !== null && uploaderId === currentUser.id;
  const subscribed = isSubscribedTo(uploaderId);

  if (videoQuery.isLoading) return <p className="status-text">Loading video...</p>;
  if (!videoQuery.data) return <p className="status-text">Video not found.</p>;

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!author.trim() || !content.trim()) return;
    await commentMutation.mutateAsync();
  };

  return (
    <main className="watch-layout">
      <section>
        <video src={streamSrc} controls className="player" />
        <h1 className="watch-title">{videoQuery.data.title}</h1>
        {videoQuery.data.uploader ? (
          <div className="watch-uploader-row">
            <strong>{videoQuery.data.uploader.display_name}</strong>
            {showSubscribeButton ? (
              subscribed ? (
                <button type="button" className="secondary-btn" onClick={() => void unsubscribe(uploaderId!)}>
                  Unsubscribe
                </button>
              ) : (
                <button type="button" onClick={() => void subscribe(uploaderId!)}>
                  Subscribe
                </button>
              )
            ) : null}
            {isOwner ? (
              <button type="button" className="danger-btn" onClick={() => void deleteMutation.mutateAsync()}>
                {deleteMutation.isPending ? 'Deleting...' : 'Delete video'}
              </button>
            ) : null}
          </div>
        ) : null}
        <p className="watch-stats">{formatViews(videoQuery.data.views)}</p>
        <p className="watch-description">{videoQuery.data.description || 'No description'}</p>

        <div className="comments">
          <h2>Comments</h2>
          <form onSubmit={handleSubmit} className="comment-form">
            <input
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              placeholder="Your name"
              required
            />
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Add a comment"
              required
            />
            <button type="submit" disabled={commentMutation.isPending}>
              {commentMutation.isPending ? 'Posting...' : 'Post'}
            </button>
          </form>

          {commentsQuery.data?.map((comment) => (
            <article key={comment.id} className="comment-item">
              <strong>{comment.author}</strong>
              <p>{comment.content}</p>
            </article>
          ))}
        </div>
      </section>

      <aside>
        <h2 className="rec-title">Recommended</h2>
        <div className="recommended-list">
          {recommendedQuery.data?.map((video) => (
            <Link key={video.id} to={`/watch/${video.id}`} className="recommended-item">
              <div className="recommended-thumb">
                {video.thumbnail_url ? <img src={toAbsoluteApiUrl(video.thumbnail_url)} alt={`${video.title} thumbnail`} /> : null}
              </div>
              <div>
                <strong>{video.title}</strong>
                <span>{formatViews(video.views)}</span>
              </div>
            </Link>
          ))}
        </div>
      </aside>
    </main>
  );
}
