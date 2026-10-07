'use client';
import {useI18n} from './use-i18n';
import Link from 'next/link';
import {ArrowUpRight,ChevronRight,Compass} from 'lucide-react';
import {articleKey,articleLanguage} from '@/lib/languages';
import {exploreUrl} from '@/lib/trail';
import {useLibrary} from './library-provider';
import {useSettings} from './settings-provider';
export function Stats(){
  const {t,language}=useI18n();
  const {saved,recent,paths,ready}=useLibrary();
  const {preferences}=useSettings();
  const pathTopics=new Set(paths.flatMap(p=>p.articles.map(articleKey))).size;
  const longest=paths.reduce((max,p)=>Math.max(max,p.articles.length),0);
  const metrics=[['Saved topics',saved.length],['Recently explored',recent.length],['Saved paths',paths.length],['Topics in paths',pathTopics],['Longest path',longest]] as const;
  return <main className="library-page stats-page">
    <header className="page-heading stats-heading"><h1>{t("Stats")}</h1><span>{t("Your learning, at a glance")}</span></header>
    {!ready ? <p className="library-empty">{t("Loading your stats…")}</p> : <div className="stats-content">
      <section className="stats-overview" aria-label={t("Learning stats")}>
        <dl className="stats-grid">{metrics.map(([label,value],index)=><div className={index<2 ? 'stats-primary' : 'stats-secondary'} key={label}><dt>{t(label)}</dt><dd>{value}</dd></div>)}</dl>
        <div className="stats-overview-footer"><span>{preferences.storeData ? t('On this device') : t('This session · storage is off')}</span><Link href="/library">{t("View library")} <ArrowUpRight size={14}/></Link></div>
      </section>
      <section className="stats-recent" aria-labelledby="stats-recent-heading">
        <div className="stats-section-heading"><h2 id="stats-recent-heading">{t("Recently explored")}</h2>{recent.length>0 && <span>{t('Latest {count}',{count:recent.length})}</span>}</div>
        {recent.length ? <ul className="stats-topic-list">{recent.map(a=><li key={articleKey(a)}><Link href={exploreUrl(a.title,[],articleLanguage(a))}><span>{a.title}</span><ChevronRight size={16}/></Link></li>)}</ul> : <div className="stats-empty"><Compass size={26}/><p>{t("Your next rabbit hole starts here.")}</p><Link href="/scroll">{t("Explore topics")} <ArrowUpRight size={15}/></Link></div>}
      </section>
      <details className="stats-info"><summary>{t("About these stats")}</summary><p>{t('Stats explanation')} {preferences.storeData ? t('Your activity is stored on this device.') : t('Storage is off, so activity lasts for this session.')}</p></details>
    </div>}
  </main>;
}
