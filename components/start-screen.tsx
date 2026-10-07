'use client';
import {useI18n} from './use-i18n';
import {useEffect,useRef,useState} from 'react';
import {usePathname} from 'next/navigation';
import {Orbit,Plus,X} from 'lucide-react';
import {useDiscovery} from './discovery-provider';
import {translate,type Message} from '@/lib/messages';
import {CATEGORY_ANCHORS} from '@/lib/feed-profile';
export function StartScreen(){
  const {t,language}=useI18n();
  const {preferences,ready,editing,update,finish}=useDiscovery();
  const pathname=usePathname(),dialog=useRef<HTMLDialogElement>(null);
  const [custom,setCustom]=useState('');
  const shouldOpen=ready && (editing || (!preferences.started && pathname==='/scroll'));
  useEffect(()=>{if(shouldOpen && !dialog.current?.open) {dialog.current?.showModal();dialog.current?.focus({preventScroll:true});}else if(!shouldOpen && dialog.current?.open) dialog.current.close();},[shouldOpen]);
  function toggle(interest:string){update({interests:preferences.interests.includes(interest) ? preferences.interests.filter(t=>t!==interest) : [...preferences.interests,interest].slice(0,8)});}
  function add(){const value=custom.trim().slice(0,100);if(value && !/[\x00-\x1f|]/.test(value)){if(!preferences.interests.includes(value)) toggle(value);setCustom('');}}
  return <dialog ref={dialog} className="start-screen" tabIndex={-1} aria-labelledby="welcome-title" onCancel={event=>event.preventDefault()}><div className="start-screen-content"><div className="start-title"><Orbit size={35}/><div><h1 id="welcome-title">Scrollipedia</h1><h2>{t("Addictive learning")}</h2><p className="creator-credit">{t("Created by")} <a className="creator-link" href="https://github.com/XavierRHMN" target="_blank" rel="noreferrer">XavierRHMN</a></p></div></div><p>{t('Intro description')}</p><p>{t('Intro sources')}</p><p>{t('Intro privacy')}</p><p className="start-links">{t("Source code on")} <a href="https://github.com/XavierRHMN/Scrollipedia" target="_blank" rel="noreferrer">GitHub</a>.</p><h3>{t("Pick a few interests to get started")} <span>{t("(optional)")}</span></h3><div className="category-picks">{Object.keys(CATEGORY_ANCHORS).map(category=><label className={preferences.interests.includes(category) ? 'category-picker picked' : 'category-picker'} key={category}><input type="checkbox" checked={preferences.interests.includes(category)} disabled={!preferences.interests.includes(category)&&preferences.interests.length>=8} onChange={()=>toggle(category)}/>{t(category as Message)}</label>)}</div><h3>{t("Or add your own")}</h3><form className="category-search" onSubmit={event=>{event.preventDefault();add();}}><input aria-label={t("Custom interest")} placeholder={t("Black holes, Estonia, ancient Rome…")} maxLength={100} value={custom} onChange={e=>setCustom(e.target.value)}/><button aria-label={t("Add interest")} disabled={!custom.trim() || preferences.interests.length>=8}><Plus size={20}/></button></form><div className="custom-picks">{preferences.interests.filter(t=>!Object.hasOwn(CATEGORY_ANCHORS,t)).map(t=><button key={t} onClick={()=>toggle(t)} aria-label={translate(language,'Remove interest {title}',{title:t})}>{t}<X size={14}/></button>)}</div><p className="start-note start-warning"><strong>{t("Some topics may be NSFW.")}</strong> {t('NSFW description')}</p><button className="start-button" onClick={finish}>{preferences.started ? t('Update my feed') : t('I’m an adult, continue')}</button></div></dialog>;
}
