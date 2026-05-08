import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { fetchVideos } from '../api/client';
import type { Video } from '../types';

const PAGE_SIZE = 20;

type VideoCacheContextValue = {
  videos: Video[];
  loading: boolean;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  refreshVideos: () => Promise<void>;
};

const VideoCacheContext = createContext<VideoCacheContextValue | undefined>(undefined);

export function VideoCacheProvider({ children }: { children: React.ReactNode }) {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const offsetRef = useRef(0);

  const loadMore = useCallback(async () => {
    if (!hasMore) return;
    setLoading(true);
    try {
      const page = await fetchVideos(offsetRef.current, PAGE_SIZE);
      setVideos((prev) => {
        const ids = new Set(prev.map((v) => v.id));
        const newOnes = page.filter((v) => !ids.has(v.id));
        return [...prev, ...newOnes];
      });
      offsetRef.current += page.length;
      setHasMore(page.length === PAGE_SIZE);
    } finally {
      setLoading(false);
    }
  }, [hasMore]);

  const refreshVideos = useCallback(async () => {
    offsetRef.current = 0;
    setHasMore(true);
    setVideos([]);
    setLoading(true);
    try {
      const page = await fetchVideos(0, PAGE_SIZE);
      setVideos(page);
      offsetRef.current = page.length;
      setHasMore(page.length === PAGE_SIZE);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshVideos();
  }, []);

  const value = useMemo(
    () => ({ videos, loading, hasMore, loadMore, refreshVideos }),
    [videos, loading, hasMore, loadMore, refreshVideos]
  );

  return <VideoCacheContext.Provider value={value}>{children}</VideoCacheContext.Provider>;
}

export function useVideoCache() {
  const context = useContext(VideoCacheContext);
  if (!context) throw new Error('useVideoCache must be used within VideoCacheProvider');
  return context;
}
