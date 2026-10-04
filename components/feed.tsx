'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { LoaderCircle } from 'lucide-react';
import type { WikiArticle } from '@/types';
import { Button } from './ui/button';
import { TopicPost } from './topic-post';
import { FeedSidebar } from './feed-sidebar';
import { rememberArticle } from '@/lib/topic-client';
export function Feed() {
  const [items, setItems] = useState<WikiArticle[]>([]), [loading, setLoading] = useState(true), [error, setError] = useState('');
  const [sourceWarning, setSourceWarning] = useState(''), [retryUntil, setRetryUntil] = useState(0), [wait, setWait] = useState(0);
  const seen = useRef<number[]>([]);
  const offset = useRef(0), busy = useRef(false), sentinel = useRef<HTMLDivElement>(null), abort = useRef<AbortController | null>(null);
  const loadMore = useCallback(async () => {
    if (busy.current) return;
    busy.current = true; setLoading(true); setError('');
    const controller = new AbortController(); abort.current = controller;
    try {
      const response = await fetch(`/api/wikipedia?offset=${offset.current}${seen.current.length ? `&exclude=${seen.current.slice(-200).join(',')}` : ''}`, { signal: controller.signal, cache: 'no-store' });
      if (!response.ok) {
        const failure = await response.json().catch(() => ({}));
        if (response.status === 429) { const delay = Number(failure.retryAfter || response.headers.get('retry-after') || 5); setRetryUntil(Date.now()+(Number.isFinite(delay) ? delay : 5)*1000); }
        throw new Error(response.status === 429 ? failure.error || 'Wikipedia is temporarily limiting requests.' : 'Could not load articles from Wikipedia.');
      }
      const result = await response.json() as { articles: WikiArticle[]; next: number; sourceWarning?: string };
      if (controller.signal.aborted) return;
      result.articles.forEach(rememberArticle);
      seen.current = [...new Set([...seen.current,...result.articles.map(a => a.pageId)])].slice(-200);
      setSourceWarning(result.sourceWarning || ''); setRetryUntil(0);
      setItems(previous => [...previous, ...result.articles.filter(a => !previous.some(p => p.pageId === a.pageId))]); offset.current = result.next;
    } catch (e) { if (!controller.signal.aborted) setError(e instanceof Error ? e.message : 'Could not load topics.'); }
    finally { if (abort.current === controller) { busy.current = false; setLoading(false); } }
  }, []);
  useEffect(() => { void loadMore(); return () => { abort.current?.abort(); busy.current = false; }; }, [loadMore]);
  useEffect(() => {
    function reset() { abort.current?.abort(); busy.current = false; offset.current = 0; seen.current = []; setItems([]); void loadMore(); }
    window.addEventListener('scrollipedia:reset-feed', reset);
    return () => window.removeEventListener('scrollipedia:reset-feed', reset);
  }, [loadMore]);
  useEffect(() => {
    function tick() { setWait(Math.max(0,Math.ceil((retryUntil-Date.now())/1000))); }
    tick(); if (!retryUntil) return;
    const timer = setInterval(tick,1000); return () => clearInterval(timer);
  }, [retryUntil]);
  useEffect(() => {
    const observer = new IntersectionObserver(entries => { if (entries[0].isIntersecting && !error) void loadMore(); }, { rootMargin: '700px' });
    if (sentinel.current) observer.observe(sentinel.current); return () => observer.disconnect();
  }, [loadMore, error, items.length]);
  return <main className="scroll-page"><div className="feed-scroll" aria-label="Wikipedia discovery feed"><div className="page-heading"><h1>Scroll</h1><span>Wikipedia, one article at a time</span></div>{sourceWarning && <p className="storage-notice" role="status">{sourceWarning}</p>}{items.map((article,index) => <TopicPost key={article.pageId} article={article} index={index} priority={index === 0}/>)}{loading && <div className="feed-loading" role="status"><LoaderCircle className="spin" size={20}/><span>Loading articles…</span></div>}{error && <div className="feed-error" role="alert"><h2>Could not load articles.</h2><p>{error}</p><Button variant="outline" disabled={wait > 0} onClick={loadMore}>{wait > 0 ? `Try again in ${wait}s` : 'Try again'}</Button></div>}<div ref={sentinel} className="feed-sentinel"/></div><FeedSidebar/></main>;
}
