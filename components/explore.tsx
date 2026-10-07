'use client';
import {useI18n} from './use-i18n';
import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Bookmark, BookOpen, Check, ChevronRight, LoaderCircle, Route, X } from 'lucide-react';
import type { TopicDetail, WikiArticle } from '@/types';
import { useLibrary } from './library-provider';
import { Button } from './ui/button';
import { NarrationButton } from './narration-button';
import { parseTrail } from '@/lib/trail';
import { knownClientTopic, rememberTopic } from '@/lib/topic-client';
import { useWikipediaLink } from './settings-provider';
import {DEFAULT_LANGUAGE,isLanguage,articleLanguage,articleKey,type Language} from '@/lib/languages';
function MapLoading(){const {t}=useI18n();return <div className="graph-loading"><LoaderCircle size={26} className="spin"/>{t('Drawing connections…')}</div>;}
const KnowledgeGraph = dynamic(() => import('./knowledge-graph').then(m => m.KnowledgeGraph), { ssr: false, loading: MapLoading });
export function Explore({ title }: { title: string }) {
  const {t,language,ready:settingsReady}=useI18n();
  const wikipediaLink = useWikipediaLink();
  const [topic, setTopic] = useState<TopicDetail | null>(null), [error, setError] = useState(''), [section, setSection] = useState(0), [panel, setPanel] = useState(true), [trail, setTrail] = useState<WikiArticle[]>([]), [pathSaved, setPathSaved] = useState(false);
  const search = useSearchParams(); const savedPathId = search.get('path');
  const rawSource=search.get('lang'),sourceLanguage=isLanguage(rawSource) ? rawSource : DEFAULT_LANGUAGE;
  const trailQuery = search.get('trail');
  const { toggle, isSaved, visit, savePath, paths, ready } = useLibrary();
  const last = useRef('');
  const requestRef = useRef<AbortController | null>(null);
  const sessionTopics = useRef(new Map<string,TopicDetail>());
  const [loadingTopic,setLoadingTopic] = useState('');
  const articleRef = useRef<HTMLElement | null>(null);
  const articleHeadingRef = useRef<HTMLHeadingElement | null>(null);
  const [articleRequested,setArticleRequested] = useState(false);
  function openArticle() { setSection(0); setPanel(true); setArticleRequested(true); }
  useEffect(()=>{
    if(!articleRequested || !panel || !articleRef.current) return;
    articleRef.current.scrollTop=0;
    articleRef.current.scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth'});
    articleHeadingRef.current?.focus({preventScroll:true});
    setArticleRequested(false);
  },[articleRequested,panel]);
  async function loadTopic(next: string, force = false,source:Language=language) {
    requestRef.current?.abort();
    const cacheKey=`${language}:${source}:${next}`,cached = sessionTopics.current.get(cacheKey);
    setSection(0); setPathSaved(false); setError('');
    if (cached && !force) { setTopic(cached); setLoadingTopic(''); return; }
    const controller = new AbortController(); requestRef.current = controller;
    const known = source===language ? knownClientTopic(next,language) : null;
    if (known) setTopic(known);
    setLoadingTopic(next);
    try {
      const localeQuery=language!==DEFAULT_LANGUAGE || source!==language ? `&language=${language}&source=${source}` : '';
      const response = await fetch('/api/wikipedia?title='+encodeURIComponent(next)+localeQuery, {signal:controller.signal});
      if (!response.ok){const failure=await response.json().catch(()=>({}));throw new Error(failure.error || t('Wiki busy'));}
      const data = await response.json() as TopicDetail;
      if(controller.signal.aborted) return;
      rememberTopic(data);
      const visible = {...data,related:data.related.slice(0,6)};
      if (!data.sourceWarning) sessionTopics.current.set(cacheKey,visible);
      setTopic(visible); setLoadingTopic('');
      if (!data.sourceWarning) void fetch('/api/gemini',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({title:data.article.title,language}),signal:controller.signal}).then(async r=>{
        if(!r.ok) return;
        const enriched=await r.json();
        if(controller.signal.aborted || !Array.isArray(enriched.related) || !enriched.related.length) return;
        const organized={...visible,related:enriched.related.slice(0,6),organized:enriched.organized};
        sessionTopics.current.set(cacheKey,organized);
        setTopic(t=>t?.article.pageId===data.article.pageId ? organized : t);
      }).catch(()=>{});
    } catch(e) {
      if(!controller.signal.aborted) {
        if(known) setTopic({...known,sourceWarning:t('Connections unavailable')});
        else setError(e instanceof Error ? e.message : 'Topic unavailable');
        setLoadingTopic('');
      }
    }
  }
  useEffect(() => {
    if(!settingsReady)return;
    sessionTopics.current.clear(); setTopic(sourceLanguage===language ? knownClientTopic(title,language) : null); setTrail([]);last.current='';
    void loadTopic(title,false,sourceLanguage);
    return () => requestRef.current?.abort();
    // Starting another article creates a new map; selecting its nodes does not.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title,language,sourceLanguage,settingsReady]);
  useEffect(() => {
    if (!topic || !ready) return;
    if(articleLanguage(topic.article)!==language)return;
    const key = `${language}:${title}:${topic.article.pageId}:${trailQuery}`;
    if (last.current === key) return;
    last.current = key; visit(topic.article);
    const restored = savedPathId ? paths.find(p => p.id === savedPathId) : undefined;
    const translatedPath=restored && restored.articles.some(a=>articleLanguage(a)!==language);
    const titles = translatedPath ? restored.articles.map(a=>a.title) : parseTrail(trailQuery);
    if (titles.length > 1 && (!restored || translatedPath) && !trail.length) {
      const controller = new AbortController();
      const params = new URLSearchParams(); titles.forEach(t => params.append('titles',t));
      const pathSource=translatedPath ? articleLanguage(restored.articles[0]) : sourceLanguage;
      if(language!==DEFAULT_LANGUAGE || pathSource!==language){params.set('language',language);params.set('source',pathSource);}
      void fetch(`/api/wikipedia?${params}`, { signal: controller.signal }).then(async response => {
        if (!response.ok) return;
        const result = await response.json() as { articles: WikiArticle[];titleMapping?:Record<string,string|null> };
        if (!controller.signal.aborted) setTrail(titles.flatMap(t => { const a = result.articles.find(a => a.title === (result.titleMapping?.[t] || t)); return a ? [a] : []; }));
      }).catch(() => {});
      return () => controller.abort();
    }
    setTrail(previous => {
      if (restored && !previous.length) return restored.articles;
      const index = previous.findIndex(a => articleKey(a)===articleKey(topic.article));
      return index >= 0 ? previous.slice(0,index+1) : [...previous, topic.article].slice(-12);
    });
  }, [topic?.article.pageId, topic?.article.language,ready, title, visit, savedPathId, paths, trailQuery,language,sourceLanguage]);
  function navigate(next: string) { void loadTopic(next); }
  if (error) return <main className="empty-state"><span className="eyebrow">{t("Explore")}</span><h1>{t("Could not load this topic.")}</h1><p>{error}</p><Button onClick={() => void loadTopic(topic?.article.title || title,true,topic ? articleLanguage(topic.article) : sourceLanguage)}>{t("Retry")}</Button><Button asChild variant="outline"><Link href="/scroll">{t("Back to Scroll")}</Link></Button></main>;
  if (!topic) return <main className="explore-loading" aria-live="polite"><LoaderCircle className="spin" size={30}/><h1>{t("Loading article")}</h1><p>{t('Opening {title}…',{title})}</p></main>;
  const selected = topic.sections[section];
  const saveTopicAction = <Button variant="outline" disabled={!ready} aria-pressed={isSaved(topic.article.pageId,articleLanguage(topic.article))} onClick={() => toggle(topic.article)}>{isSaved(topic.article.pageId,articleLanguage(topic.article)) ? <Check size={17}/> : <Bookmark size={17}/>}<span>{isSaved(topic.article.pageId,articleLanguage(topic.article)) ? t('Saved') : t('Save topic')}</span></Button>;
  const articleToggle = <Button variant="outline" className="article-toggle" aria-controls="article-overview" aria-expanded={panel} onClick={() => setPanel(value => !value)}>{panel ? t('Hide article') : t('Open article')}</Button>;
  return <main className="explore-page"><div className="explore-toolbar"><div><span className="eyebrow">{t("Explore")}</span><h1>{topic.article.title}</h1></div><div className="toolbar-actions desktop-article-actions">{saveTopicAction}{articleToggle}</div></div>
  {topic.sourceWarning && <div className="topic-notice" role="status"><p>{topic.sourceWarning}</p><Button variant="outline" onClick={() => void loadTopic(topic?.article.title || title,true,topic ? articleLanguage(topic.article) : sourceLanguage)}>{t("Retry connections")}</Button></div>}<div className="explore-trail" aria-label={t("Exploration path")}><Route size={16}/>{trail.map((a,i) => <span key={`${a.pageId}-${i}`}>{i > 0 && <ChevronRight size={13}/>}<button onClick={() => navigate(a.title)}>{a.title}</button></span>)}{trail.length > 1 && <button className="save-path" disabled={pathSaved} onClick={() => { savePath(trail); setPathSaved(true); }}>{pathSaved ? t('Path saved') : t('Save path')}</button>}</div>
  <div className="article-shortcut">{saveTopicAction}<button className="article-pill" aria-controls="article-overview" onClick={openArticle}><BookOpen size={16}/><span>{t("Open article")}</span></button></div>
  <div className={panel ? 'explore-workspace' : 'explore-workspace panel-hidden'}><KnowledgeGraph key={`${language}:${title}`} article={topic.article} related={topic.related} onSelect={navigate} loading={loadingTopic} complete={!topic.sourceWarning}/>{panel && <aside id="article-overview" ref={articleRef} className="article-panel" aria-labelledby="article-heading"><div className="panel-heading"><span className="eyebrow">{t("Article")}</span><button className="mobile-panel-close" aria-label={t("Close article panel")} onClick={() => setPanel(false)}><X size={20}/></button></div><h2 id="article-heading" ref={articleHeadingRef} tabIndex={-1}>{topic.article.title}</h2>{topic.article.description && <p className="article-description">{topic.article.description}</p>}<div className="section-tabs" role="tablist" aria-label={t("Article sections")}>{topic.sections.map((s,i) => <button key={`${s.title}-${i}`} role="tab" aria-selected={i === section} aria-controls="section-content" onClick={() => setSection(i)}>{s.title}</button>)}</div><div id="section-content" role="tabpanel" className="section-content"><div className="section-heading"><h3>{selected?.title}</h3><NarrationButton key={`${topic.article.title}-${section}`} title={topic.article.title} section={section} language={articleLanguage(topic.article)}/></div>{selected?.content.split('\n\n').map((p,i) => <p key={i}>{p}</p>)}</div><a href={wikipediaLink(topic.article)} target="_blank" rel="noreferrer" className="article-source">{t("Read the full article on Wikipedia")}</a><p className="source-credit">Wikipedia · CC BY-SA 4.0<br/>{topic.organized ? t('Connections organized with Gemini.') : t('Connections from Wikipedia & Wikidata.')}</p></aside>}</div>
  <div className="related-accessible"><span className="eyebrow">{t("Related topics")}</span>{topic.related.map(r => <button key={r.pageId} onClick={() => navigate(r.title)}>{r.title}</button>)}{!topic.related.length && <p>{t("No related topics were available. Try another article from Scroll.")}</p>}</div></main>;
}
