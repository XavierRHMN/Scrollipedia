'use client';
import { useEffect,useId,useRef,useState } from 'react';
import { WikiImage } from './wiki-image';
import Link from 'next/link';
import { Bookmark, Check, Compass, X,MoreHorizontal,EyeOff } from 'lucide-react';
import type { WikiArticle } from '@/types';
import { useLibrary } from './library-provider';
import { NarrationButton } from './narration-button';
import { useWikipediaLink } from './settings-provider';
import {shortRead} from '@/lib/short-read';
import {useI18n} from './use-i18n';
import {articleLanguage} from '@/lib/languages';
import {exploreUrl} from '@/lib/trail';
export function TopicPost({ article, priority = false, index,onNotInterested }: { article: WikiArticle; priority?: boolean; index?: number;onNotInterested?:(article:WikiArticle)=>void }) {
  const {t}=useI18n();
  const { isSaved, toggle, ready } = useLibrary();
  const wikipediaLink = useWikipediaLink();
  const dialog = useRef<HTMLDialogElement>(null);
  const menuId=useId(),menu=useRef<HTMLDivElement>(null),menuButton=useRef<HTMLButtonElement>(null),menuItem=useRef<HTMLButtonElement>(null);
  const [menuOpen,setMenuOpen]=useState(false);
  useEffect(()=>{
    if(!menuOpen)return;
    menuItem.current?.focus();
    const outside=(event:PointerEvent)=>{if(!menu.current?.contains(event.target as Node))setMenuOpen(false);};
    const escape=(event:KeyboardEvent)=>{if(event.key==='Escape'){event.preventDefault();setMenuOpen(false);menuButton.current?.focus();}};
    document.addEventListener('pointerdown',outside);document.addEventListener('keydown',escape);
    return()=>{document.removeEventListener('pointerdown',outside);document.removeEventListener('keydown',escape);};
  },[menuOpen]);
  const sourceLanguage=articleLanguage(article),saved=isSaved(article.pageId,sourceLanguage);
  const href = exploreUrl(article.title,[],sourceLanguage);
  const summary = shortRead(article.feedSummary || article.extract,45,sourceLanguage);
  return <article className="topic-post feed-slide" data-index={index}>
    <div className="post-heading"><h2><Link href={href}>{article.title}</Link></h2>{onNotInterested && <div ref={menu} className="post-options"><button ref={menuButton} className="post-options-trigger" aria-label={t('Post options for {title}',{title:article.title})} aria-haspopup="menu" aria-expanded={menuOpen} aria-controls={menuOpen ? menuId : undefined} onClick={()=>setMenuOpen(value=>!value)}><MoreHorizontal size={21}/></button>{menuOpen && <div id={menuId} role="menu" className="post-options-menu" aria-label={t('Post options for {title}',{title:article.title})}><button ref={menuItem} role="menuitem" onClick={()=>{setMenuOpen(false);onNotInterested(article);}} onKeyDown={event=>{if(event.key==='Tab')setMenuOpen(false);if(event.key==='ArrowDown'||event.key==='ArrowUp'){event.preventDefault();menuItem.current?.focus();}}}><EyeOff size={17}/>{t('Not interested')}</button></div>}</div>}</div><p className="post-summary">{summary}</p>
    {article.thumbnail && <><button className="post-image-button" aria-label={t('Enlarge image of {title}',{title:article.title})} onClick={() => dialog.current?.showModal()}><WikiImage src={article.thumbnail} fallbackSrc={article.originalImage} alt={article.title} width={512} height={330} sizes="(max-width: 600px) calc(100vw - 48px), 512px" priority={priority} className="post-media"/></button><dialog className="image-dialog" ref={dialog} onClick={event => { if (event.target === event.currentTarget) dialog.current?.close(); }}><button className="image-close" aria-label={t("Close image")} onClick={() => dialog.current?.close()}><X size={24}/></button><WikiImage src={article.thumbnail} fallbackSrc={article.originalImage} alt={article.title} width={1200} height={900} sizes="95vw" className="full-image"/><a href={wikipediaLink(article)} target="_blank" rel="noreferrer">{article.title} · Wikipedia</a></dialog></>}
    <div className="post-actions"><Link className="post-explore" href={href}><Compass size={18}/>{t('Explore topic')}</Link><NarrationButton title={article.title} language={sourceLanguage}/><button className={saved ? 'post-save saved' : 'post-save'} disabled={!ready} aria-label={saved ? t('Saved') : t('Save')} aria-pressed={saved} onClick={() => toggle(article)}>{saved ? <Check size={20}/> : <Bookmark size={20}/>}</button></div>
  </article>;
}
