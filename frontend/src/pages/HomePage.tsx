import { useEffect, useRef } from 'react';
import { useVideoCache } from '../context/VideoCacheContext';
import { VideoCard } from '../components/VideoCard';

export function HomePage() {
  const { videos, loading, hasMore, loadMore } = useVideoCache();
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          void loadMore();
        }
      },
      { rootMargin: '200px' }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loading, loadMore]);

  return (
    <main className="home-main">
      <div className="chip-row">
        <button className="chip chip-active">All</button>
        <button className="chip">Music</button>
        <button className="chip">Gaming</button>
        <button className="chip">News</button>
        <button className="chip">Live</button>
      </div>

      <div className="grid">
        {videos.map((video) => (
          <VideoCard key={video.id} video={video} />
        ))}
      </div>

      <div ref={sentinelRef} style={{ height: '1px' }} />

      {loading && <p className="status-text">Loading videos...</p>}
      {!hasMore && videos.length > 0 && (
        <p className="status-text">No more videos.</p>
      )}
    </main>
  );
}
