'use client';
import Link from 'next/link';
import {ArrowUpRight,ChevronRight,Compass} from 'lucide-react';
import {useLibrary} from './library-provider';
import {useSettings} from './settings-provider';
export function Stats(){
  const {saved,recent,paths,ready}=useLibrary();
  const {preferences}=useSettings();
  const pathTopics=new Set(paths.flatMap(p=>p.articles.map(a=>a.pageId))).size;
  const longest=paths.reduce((max,p)=>Math.max(max,p.articles.length),0);
  const metrics=[['Saved topics',saved.length],['Recently explored',recent.length],['Saved paths',paths.length],['Topics in paths',pathTopics],['Longest path',longest]] as const;
  return <main className="library-page stats-page">
    <header className="page-heading stats-heading"><h1>Stats</h1><span>Your learning, at a glance</span></header>
    {!ready ? <p className="library-empty">Loading your stats…</p> : <div className="stats-content">
      <section className="stats-overview" aria-label="Learning stats">
        <dl className="stats-grid">{metrics.map(([label,value],index)=><div className={index<2 ? 'stats-primary' : 'stats-secondary'} key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
        <div className="stats-overview-footer"><span>{preferences.storeData ? 'On this device' : 'This session · storage is off'}</span><Link href="/library">View library <ArrowUpRight size={14}/></Link></div>
      </section>
      <section className="stats-recent" aria-labelledby="stats-recent-heading">
        <div className="stats-section-heading"><h2 id="stats-recent-heading">Recently explored</h2>{recent.length>0 && <span>Latest {recent.length}</span>}</div>
        {recent.length ? <ul className="stats-topic-list">{recent.map(a=><li key={a.pageId}><Link href={`/explore/${encodeURIComponent(a.title)}`}><span>{a.title}</span><ChevronRight size={16}/></Link></li>)}</ul> : <div className="stats-empty"><Compass size={26}/><p>Your next rabbit hole starts here.</p><Link href="/scroll">Explore topics <ArrowUpRight size={15}/></Link></div>}
      </section>
      <details className="stats-info"><summary>About these stats</summary><p>Recently explored counts your latest 12 distinct topics. Path stats reflect your saved paths; longest path is measured in topics. {preferences.storeData ? 'Your activity is stored on this device.' : 'Storage is off, so activity lasts for this session.'}</p></details>
    </div>}
  </main>;
}
