'use client';
import { useRef } from 'react';
import { WikiImage } from './wiki-image';
import Link from 'next/link';
import { Bookmark, Check, Compass, X } from 'lucide-react';
import type { WikiArticle } from '@/types';
import { useLibrary } from './library-provider';
import { NarrationButton } from './narration-button';
import { useWikipediaLink } from './settings-provider';
import {shortRead} from '@/lib/short-read';
export function TopicPost({ article, priority = false, index }: { article: WikiArticle; priority?: boolean; index?: number }) {
  const { isSaved, toggle, ready } = useLibrary();
  const wikipediaLink = useWikipediaLink();
  const dialog = useRef<HTMLDialogElement>(null);
  const href = `/explore/${encodeURIComponent(article.title)}`;
  const summary = shortRead(article.feedSummary || article.extract);
  return <article className="topic-post feed-slide" data-index={index}>
    <h2><Link href={href}>{article.title}</Link></h2><p className="post-summary">{summary}</p>
    {article.thumbnail && <><button className="post-image-button" aria-label={`Enlarge image of ${article.title}`} onClick={() => dialog.current?.showModal()}><WikiImage src={article.thumbnail} fallbackSrc={article.originalImage} alt={article.title} width={512} height={330} sizes="(max-width: 600px) calc(100vw - 48px), 512px" priority={priority} className="post-media"/></button><dialog className="image-dialog" ref={dialog} onClick={event => { if (event.target === event.currentTarget) dialog.current?.close(); }}><button className="image-close" aria-label="Close image" onClick={() => dialog.current?.close()}><X size={24}/></button><WikiImage src={article.thumbnail} fallbackSrc={article.originalImage} alt={article.title} width={1200} height={900} sizes="95vw" className="full-image"/><a href={wikipediaLink(article)} target="_blank" rel="noreferrer">{article.title} · Wikipedia</a></dialog></>}
    <div className="post-actions"><Link className="post-explore" href={href}><Compass size={18}/>Explore topic</Link><NarrationButton title={article.title}/><button className={isSaved(article.pageId) ? 'post-save saved' : 'post-save'} disabled={!ready} aria-label={isSaved(article.pageId) ? 'Saved' : 'Save'} aria-pressed={isSaved(article.pageId)} onClick={() => toggle(article)}>{isSaved(article.pageId) ? <Check size={20}/> : <Bookmark size={20}/>}</button></div>
  </article>;
}
