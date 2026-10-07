'use client';
import {useI18n} from './use-i18n';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bookmark, Compass, Layers, Orbit, ChartNoAxesColumn } from 'lucide-react';
import { useLibrary } from './library-provider';
import {LANGUAGES,articleLanguage} from '@/lib/languages';
import {exploreUrl} from '@/lib/trail';
import type {Message} from '@/lib/messages';
import { SettingsDialog } from './settings-dialog';
export function AppNav() {
  const {t,language}=useI18n();
  const path = usePathname();
  const [lowered,setLowered]=useState(false);
  useEffect(()=>{
    const phone=matchMedia('(max-width: 799px)');
    let lastY=window.scrollY,distance=0,direction=0,frame=0;
    // Route changes and feed restoration should start with navigation visible.
    const settleUntil=performance.now()+250;
    setLowered(false);
    function update(){
      frame=0;
      const y=Math.max(0,Math.min(window.scrollY,document.documentElement.scrollHeight-window.innerHeight));
      const delta=y-lastY;lastY=y;
      if(!phone.matches || y<=24 || document.querySelector('dialog[open]') || document.body.style.position==='fixed'){
        distance=0;direction=0;setLowered(false);return;
      }
      if(performance.now()<settleUntil || Math.abs(delta)<1)return;
      const nextDirection=Math.sign(delta);
      if(nextDirection!==direction){direction=nextDirection;distance=0;}
      distance+=Math.abs(delta);
      if(direction>0 && distance>=48)setLowered(true);
      else if(direction<0 && distance>=12)setLowered(false);
    }
    function scroll(){if(!frame)frame=requestAnimationFrame(update);}
    function resize(){lastY=window.scrollY;distance=0;direction=0;setLowered(false);}
    window.addEventListener('scroll',scroll,{passive:true});phone.addEventListener('change',resize);
    return()=>{window.removeEventListener('scroll',scroll);phone.removeEventListener('change',resize);if(frame)cancelAnimationFrame(frame);};
  },[path]);
  const { saved, recent } = useLibrary();
  const exploreHref = recent[0] ? exploreUrl(recent[0].title,[],articleLanguage(recent[0])) : exploreUrl(LANGUAGES[language].defaultTopic,[],language);
  return <header className={`app-header${lowered ? ' mobile-nav-lowered' : ''}`} onFocusCapture={()=>setLowered(false)}><Link href="/scroll" className="brand" aria-label={t("Scrollipedia home")}><Orbit size={30}/><span>Scrollipedia</span></Link><nav aria-label={t("Main navigation")}>
    {[{ name: 'Scroll', href: '/scroll', icon: Layers }, { name: 'Explore', href: exploreHref, icon: Compass }, { name: 'Library', href: '/library', icon: Bookmark }, { name: 'Stats', href: '/stats', icon: ChartNoAxesColumn }].map(({ name, href, icon: Icon }) => <Link key={name} href={href} aria-current={path.startsWith('/' + name.toLowerCase()) ? 'page' : undefined} className={path.startsWith('/' + name.toLowerCase()) ? 'nav-link active' : 'nav-link'}><Icon size={23}/><span>{t(name as Message)}</span>{name === 'Library' && saved.length > 0 && <span className="nav-count">{saved.length}</span>}</Link>)}
    <SettingsDialog/>
  </nav></header>;
}
