'use client';
import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Bookmark, Check, ChevronRight, LoaderCircle, Route, X } from 'lucide-react';
import type { TopicDetail, WikiArticle } from '@/types';
import { useLibrary } from './library-provider';
import { Button } from './ui/button';
import { NarrationButton } from './narration-button';
import { exploreUrl, parseTrail } from '@/lib/trail';
import { knownClientTopic, rememberTopic } from '@/lib/topic-client';
import { useWikipediaLink } from './settings-provider';
import { AiSummary } from './ai-summary';
const KnowledgeGraph = dynamic(() => import('./knowledge-graph').then(m => m.KnowledgeGraph), { ssr: false, loading: () => <div className="graph-loading"><LoaderCircle size={26} className="spin"/>Drawing connections…</div> });
export function Explore({ title }: { title: string }) {
  const wikipediaLink = useWikipediaLink();
  const [topic, setTopic] = useState<TopicDetail | null>(null), [error, setError] = useState(''), [section, setSection] = useState(0), [panel, setPanel] = useState(true), [trail, setTrail] = useState<WikiArticle[]>([]), [pathSaved, setPathSaved] = useState(false), [retry, setRetry] = useState(0);
  const router = useRouter(), search = useSearchParams(); const savedPathId = search.get('path');
  const trailQuery = search.get('trail');
  const { toggle, isSaved, visit, savePath, paths, ready } = useLibrary();
  const last = useRef('');
  useEffect(() => {
    const controller = new AbortController(); const known = knownClientTopic(title); setTopic(known); setError(''); setSection(0); setPathSaved(false);
    void (async () => {
      try {
        const response = await fetch(`/api/wikipedia?title=${encodeURIComponent(title)}`, { signal: controller.signal });
        if (!response.ok) throw new Error('Wikipedia could not refresh this topic. Please try again shortly.');
        const data = await response.json() as TopicDetail;
        if (controller.signal.aborted) return;
        rememberTopic(data);
        setTopic({ ...data, related: data.related.slice(0,6) });
        // Enrichment is asynchronous so the factual graph appears immediately.
        if (!data.sourceWarning) void fetch('/api/gemini', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: data.article.title }), signal: controller.signal }).then(async r => { if (!r.ok) return; const enriched = await r.json(); if (!controller.signal.aborted && Array.isArray(enriched.related) && enriched.related.length) setTopic(t => t ? { ...t, related: enriched.related, organized: enriched.organized } : t); }).catch(() => {});
      } catch (e) { if (!controller.signal.aborted) { if (known) setTopic({ ...known, sourceWarning: 'Wikipedia could not refresh the connections. You can read the summary and retry.' }); else setError(e instanceof Error ? e.message : 'Topic unavailable'); } }
    })();
    return () => controller.abort();
  }, [title, retry]);
  useEffect(() => {
    if (!topic || !ready) return;
    const key = `${title}:${topic.article.pageId}:${trailQuery}`;
    if (last.current === key) return;
    last.current = key; visit(topic.article);
    const restored = savedPathId ? paths.find(p => p.id === savedPathId) : undefined;
    const titles = parseTrail(trailQuery);
    if (titles.length > 1 && !restored) {
      const controller = new AbortController();
      const params = new URLSearchParams(); titles.forEach(t => params.append('titles',t));
      void fetch(`/api/wikipedia?${params}`, { signal: controller.signal }).then(async response => {
        if (!response.ok) return;
        const result = await response.json() as { articles: WikiArticle[] };
        if (!controller.signal.aborted) setTrail(titles.flatMap(t => { const a = result.articles.find(a => a.title === t); return a ? [a] : []; }));
      }).catch(() => {});
      return () => controller.abort();
    }
    setTrail(previous => {
      if (restored) return restored.articles;
      const index = previous.findIndex(a => a.pageId === topic.article.pageId);
      return index >= 0 ? previous.slice(0,index+1) : [...previous, topic.article].slice(-12);
    });
  }, [topic?.article.pageId, ready, title, visit, savedPathId, paths, trailQuery]);
  function navigate(next: string) { const index = trail.findIndex(a => a.title === next); const nextTrail = index >= 0 ? trail.slice(0,index+1) : [...trail, { title: next }]; router.push(exploreUrl(next,nextTrail)); }
  if (error) return <main className="empty-state"><span className="eyebrow">Explore</span><h1>Could not load this topic.</h1><p>{error}</p><Button onClick={() => setRetry(n => n+1)}>Retry</Button><Button asChild variant="outline"><Link href="/scroll">Back to Scroll</Link></Button></main>;
  if (!topic) return <main className="explore-loading" aria-live="polite"><LoaderCircle className="spin" size={30}/><h1>Loading article</h1><p>Opening {title}…</p></main>;
  const selected = topic.sections[section];
  return <main className="explore-page"><div className="explore-toolbar"><div><span className="eyebrow">Explore</span><h1>{topic.article.title}</h1></div><div className="toolbar-actions"><Button variant="outline" disabled={!ready} aria-pressed={isSaved(topic.article.pageId)} onClick={() => toggle(topic.article)}>{isSaved(topic.article.pageId) ? <Check size={17}/> : <Bookmark size={17}/>}<span>{isSaved(topic.article.pageId) ? 'Saved' : 'Save topic'}</span></Button><Button variant="outline" onClick={() => setPanel(v => !v)}>{panel ? 'Hide article' : 'Read article'}</Button></div></div>
  {topic.sourceWarning && <div className="topic-notice" role="status"><p>{topic.sourceWarning}</p><Button variant="outline" onClick={() => setRetry(n => n+1)}>Retry connections</Button></div>}<div className="explore-trail" aria-label="Exploration path"><Route size={16}/>{trail.map((a,i) => <span key={`${a.pageId}-${i}`}>{i > 0 && <ChevronRight size={13}/>}<button onClick={() => navigate(a.title)}>{a.title}</button></span>)}{trail.length > 1 && <button className="save-path" disabled={pathSaved} onClick={() => { savePath(trail); setPathSaved(true); }}>{pathSaved ? 'Path saved' : 'Save path'}</button>}</div>
  <AiSummary key={topic.article.title} title={topic.article.title}/>
  <div className={panel ? 'explore-workspace' : 'explore-workspace panel-hidden'}><KnowledgeGraph article={topic.article} related={topic.related} onSelect={navigate}/>{panel && <aside className="article-panel"><div className="panel-heading"><span className="eyebrow">Article</span><button className="mobile-panel-close" aria-label="Close article panel" onClick={() => setPanel(false)}><X size={20}/></button></div><h2>{topic.article.title}</h2>{topic.article.description && <p className="article-description">{topic.article.description}</p>}<div className="section-tabs" role="tablist" aria-label="Article sections">{topic.sections.map((s,i) => <button key={`${s.title}-${i}`} role="tab" aria-selected={i === section} aria-controls="section-content" onClick={() => setSection(i)}>{s.title}</button>)}</div><div id="section-content" role="tabpanel" className="section-content"><div className="section-heading"><h3>{selected?.title}</h3><NarrationButton key={`${title}-${section}`} title={topic.article.title} section={section}/></div>{selected?.content.split('\n\n').map((p,i) => <p key={i}>{p}</p>)}</div><a href={wikipediaLink(topic.article)} target="_blank" rel="noreferrer" className="article-source">Read the full article on Wikipedia</a><p className="source-credit">Wikipedia · CC BY-SA 4.0<br/>{topic.organized ? 'Connections organized with Gemini.' : 'Connections from Wikipedia & Wikidata.'}</p></aside>}</div>
  <div className="related-accessible"><span className="eyebrow">Related topics</span>{topic.related.map(r => <button key={r.pageId} onClick={() => navigate(r.title)}>{r.title}</button>)}{!topic.related.length && <p>No related topics were available. Try another article from Scroll.</p>}</div></main>;
}
