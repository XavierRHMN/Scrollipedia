'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowDown,LoaderCircle } from 'lucide-react';
import type { WikiArticle } from '@/types';
import { Button } from './ui/button';
import { TopicPost } from './topic-post';
import { FeedSidebar } from './feed-sidebar';
import {useDiscovery} from './discovery-provider';
import {useLibrary} from './library-provider';
import { rememberArticle } from '@/lib/topic-client';
import {useI18n} from './use-i18n';
import {articleLanguage,articleKey,DEFAULT_LANGUAGE} from '@/lib/languages';
import {translate} from '@/lib/messages';
import {clearFeedSession,readFeedSession,writeFeedSession} from '@/lib/feed-session';
import type {Language} from '@/lib/languages';
export function Feed() {
  const {language,t,ready:settingsReady}=useI18n();
  const {preferences,ready:discoveryReady,editing,dismiss,undoDismiss} = useDiscovery();
  const {saved,recent,ready:libraryReady} = useLibrary();
  const profileRef = useRef({preferences,saved,recent,ready:false,editing,language});
  profileRef.current={preferences,saved,recent,ready:settingsReady&&discoveryReady&&libraryReady,editing,language};
  const [hidden,setHidden]=useState<WikiArticle | null>(null);
  const undo=useRef<HTMLButtonElement>(null);
  const [items, setItems] = useState<WikiArticle[]>([]), [loading, setLoading] = useState(false), [error, setError] = useState('');
  const [sourceWarning, setSourceWarning] = useState(''), [retryUntil, setRetryUntil] = useState(0), [wait, setWait] = useState(0);
  const seen = useRef<number[]>([]);
  const itemsRef=useRef<WikiArticle[]>([]),activeLanguage=useRef<Language | null>(null),feedRoot=useRef<HTMLDivElement>(null);
  const restoreY=useRef<number | null>(null),restoring=useRef(false);
  const leaving=useRef(false);
  const [restored,setRestored]=useState(0),[pull,setPull]=useState(0);
  const offset = useRef(0), busy = useRef(false), sentinel = useRef<HTMLDivElement>(null), abort = useRef<AbortController | null>(null);
  const loadMore = useCallback(async () => {
    if (busy.current || restoring.current || activeLanguage.current!==profileRef.current.language || !profileRef.current.ready || !profileRef.current.preferences.started || profileRef.current.editing) return;
    busy.current = true; setLoading(true); setError('');
    const controller = new AbortController(); abort.current = controller;
    try {
      const profile=profileRef.current;
      const dismissed=profile.preferences.dismissed.filter(a=>(a.language || DEFAULT_LANGUAGE)===profile.language);
      const excluded=[...new Set([...dismissed.map(a=>a.pageId),...seen.current])].slice(0,200);
      const response = await fetch(`/api/wikipedia?offset=${offset.current}${excluded.length ? `&exclude=${excluded.join(',')}` : ''}${profile.language!==DEFAULT_LANGUAGE ? `&language=${profile.language}` : ''}`, { method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({profile:{interests:profile.preferences.interests,saved:profile.saved.filter(a=>articleLanguage(a)===profile.language).slice(0,8).map(a=>a.title.slice(0,100)),explored:profile.recent.filter(a=>articleLanguage(a)===profile.language).slice(0,8).map(a=>a.title.slice(0,100)),disliked:dismissed.slice(0,8).map(a=>a.title.slice(0,100))}}), signal: controller.signal, cache: 'no-store' });
      if (!response.ok) {
        const failure = await response.json().catch(() => ({}));
        if (response.status === 429) { const delay = Number(failure.retryAfter || response.headers.get('retry-after') || 5); setRetryUntil(Date.now()+(Number.isFinite(delay) ? delay : 5)*1000); }
        throw new Error(response.status === 429 ? failure.error || translate(profile.language,'Wikipedia is temporarily limiting requests.') : translate(profile.language,'Could not load articles from Wikipedia.'));
      }
      const result = await response.json() as { articles: WikiArticle[]; next: number; sourceWarning?: string };
      if (controller.signal.aborted) return;
      result.articles.forEach(rememberArticle);
      seen.current = [...new Set([...seen.current,...result.articles.map(a => a.pageId)])].slice(-200);
      setSourceWarning(result.sourceWarning || ''); setRetryUntil(0);
      const nextItems=[...itemsRef.current,...result.articles.filter(a=>!itemsRef.current.some(p=>p.pageId===a.pageId))];
      itemsRef.current=nextItems;setItems(nextItems);offset.current=result.next;
      writeFeedSession(profile.language,{items:nextItems,seen:seen.current,offset:result.next,sourceWarning:result.sourceWarning || '',scrollY:window.scrollY});
    } catch (e) { if (!controller.signal.aborted) setError(e instanceof Error ? e.message : translate(profileRef.current.language,'Could not load topics.')); }
    finally { if (abort.current === controller) { busy.current = false; setLoading(false); } }
  }, []);
  useEffect(()=>{
    if(!settingsReady)return;
    const cached=readFeedSession(language);
    leaving.current=false;activeLanguage.current=language;itemsRef.current=cached?.items || [];seen.current=cached?.seen || [];offset.current=cached?.offset || 0;
    restoreY.current=cached?.scrollY ?? null;restoring.current=!!cached;
    setItems(itemsRef.current);setHidden(null);setError('');setSourceWarning(cached?.sourceWarning || '');setLoading(false);setRetryUntil(0);
    return()=>{abort.current?.abort();busy.current=false;};
  },[language,settingsReady]);
  useEffect(()=>{
    if(!items.length || restoreY.current===null)return;
    const position=restoreY.current;
    let frame=requestAnimationFrame(()=>{frame=requestAnimationFrame(()=>{
      window.scrollTo({top:position,behavior:'instant'});restoreY.current=null;restoring.current=false;setRestored(value=>value+1);
    });});
    return()=>cancelAnimationFrame(frame);
  },[items,language]);
  useEffect(()=>{
    if(!settingsReady)return;
    const trackScroll=()=>{const cached=readFeedSession(language);if(cached && !restoring.current && !leaving.current)writeFeedSession(language,{...cached,scrollY:window.scrollY});};
    const depart=(event:MouseEvent)=>{
      const anchor=(event.target as Element).closest('a[href]');
      if(!anchor || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button!==0 || anchor.getAttribute('target')==='_blank')return;
      const destination=new URL((anchor as HTMLAnchorElement).href);
      if(destination.origin===location.origin && destination.pathname!=='/scroll'){trackScroll();leaving.current=true;}
    };
    const back=()=>{trackScroll();leaving.current=true;};
    window.addEventListener('scroll',trackScroll,{passive:true});document.addEventListener('click',depart,true);window.addEventListener('popstate',back);
    return()=>{window.removeEventListener('scroll',trackScroll);document.removeEventListener('click',depart,true);window.removeEventListener('popstate',back);};
  },[language,settingsReady]);
  useEffect(() => { if(!itemsRef.current.length) void loadMore(); }, [loadMore,settingsReady,discoveryReady,libraryReady,preferences.started,editing,language]);
  useEffect(()=>{if(hidden)undo.current?.focus({preventScroll:true});},[hidden]);
  const refresh=useCallback(()=>{
    abort.current?.abort();busy.current=false;offset.current=0;seen.current=[];itemsRef.current=[];restoreY.current=null;restoring.current=false;
    clearFeedSession(profileRef.current.language);setItems([]);setHidden(null);setError('');setSourceWarning('');setRetryUntil(0);window.scrollTo({top:0,behavior:'instant'});void loadMore();
  },[loadMore]);
  useEffect(() => {
    function reset() {refresh();}
    window.addEventListener('scrollipedia:reset-feed', reset);
    return () => window.removeEventListener('scrollipedia:reset-feed', reset);
  }, [refresh]);
  useEffect(()=>{
    const root=feedRoot.current;if(!root)return;
    let start:{x:number;y:number} | null=null,distance=0;
    const begin=(event:TouchEvent)=>{distance=0;start=matchMedia('(max-width: 799px)').matches && window.scrollY<=0 && event.touches.length===1 && !busy.current ? {x:event.touches[0].clientX,y:event.touches[0].clientY} : null;};
    const move=(event:TouchEvent)=>{
      if(!start || event.touches.length!==1)return;
      const dx=event.touches[0].clientX-start.x,dy=event.touches[0].clientY-start.y;
      if(dy<0 || Math.abs(dx)>Math.max(20,dy)){start=null;distance=0;setPull(0);return;}
      if(dy>10){if(event.cancelable)event.preventDefault();distance=Math.min(100,dy*.65);setPull(distance);}
    };
    const end=()=>{const shouldRefresh=distance>=70;start=null;distance=0;setPull(0);if(shouldRefresh)refresh();};
    const cancel=()=>{start=null;distance=0;setPull(0);};
    root.addEventListener('touchstart',begin,{passive:true});root.addEventListener('touchmove',move,{passive:false});root.addEventListener('touchend',end);root.addEventListener('touchcancel',cancel);
    return()=>{root.removeEventListener('touchstart',begin);root.removeEventListener('touchmove',move);root.removeEventListener('touchend',end);root.removeEventListener('touchcancel',cancel);};
  },[refresh]);
  useEffect(() => {
    function tick() { setWait(Math.max(0,Math.ceil((retryUntil-Date.now())/1000))); }
    tick(); if (!retryUntil) return;
    const timer = setInterval(tick,1000); return () => clearInterval(timer);
  }, [retryUntil]);
  useEffect(() => {
    const observer = new IntersectionObserver(entries => { if (entries[0].isIntersecting && !error) void loadMore(); }, { rootMargin: '700px' });
    if (sentinel.current) observer.observe(sentinel.current); return () => observer.disconnect();
  }, [loadMore, error, items.length,restored]);
  return <main className="scroll-page"><div ref={feedRoot} className="feed-scroll" aria-label={t("Wikipedia discovery feed")}><div className="page-heading"><h1 dir="ltr">Scrollipedia</h1><span>{t('Wikipedia, one article at a time')} · {t('by')} <a className="creator-link" href="https://github.com/XavierRHMN" target="_blank" rel="noreferrer">XavierRHMN</a></span></div>{pull>0 && <div className="feed-pull-refresh" role="status" style={{height:pull}}><ArrowDown size={18} className={pull>=70 ? "pull-ready" : ""}/><span>{pull>=70 ? t("Release to refresh") : t("Pull down to refresh")}</span></div>}{sourceWarning && <p className="storage-notice" role="status">{sourceWarning}</p>}{items.filter(article=>!preferences.dismissed.some(d=>d.pageId===article.pageId && (d.language || DEFAULT_LANGUAGE)===articleLanguage(article))).map((article,index) => <TopicPost key={articleKey(article)} article={article} index={index} priority={index === 0} onNotInterested={article=>{dismiss({pageId:article.pageId,title:article.title,language:articleLanguage(article)});setHidden(article);}}/>)}{hidden && <div className="feed-dismiss-notice" role="status"><span>{t('Post hidden. We’ll show fewer topics like this.')}</span><button ref={undo} onClick={()=>{undoDismiss(hidden.pageId,articleLanguage(hidden));setHidden(null);}}>{t('Undo')}</button></div>}{loading && <div className="feed-loading" role="status"><LoaderCircle className="spin" size={20}/><span>{t("Loading articles…")}</span></div>}{error && <div className="feed-error" role="alert"><h2>{t("Could not load articles.")}</h2><p>{error}</p><Button variant="outline" disabled={wait > 0} onClick={loadMore}>{wait > 0 ? t('Try again in {seconds}s',{seconds:wait}) : t('Try again')}</Button></div>}<div ref={sentinel} className="feed-sentinel"/></div><FeedSidebar/></main>;
}
