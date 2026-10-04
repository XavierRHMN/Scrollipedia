'use client';
import Link from 'next/link';
import {useLibrary} from './library-provider';
import {useSettings} from './settings-provider';
export function Stats(){
  const {saved,recent,paths,ready}=useLibrary();
  const {preferences}=useSettings();
  const pathTopics=new Set(paths.flatMap(p=>p.articles.map(a=>a.pageId))).size;
  const longest=paths.reduce((max,p)=>Math.max(max,p.articles.length),0);
  return <main className="library-page stats-page"><div className="page-heading"><h1>Stats</h1><span>Your curiosity, in numbers</span></div>{!ready ? <p className="library-empty">Loading your stats…</p> : <><p className="stats-note">Based on your current library on this device{preferences.storeData ? '.' : '. Storage is off, so activity lasts for this session.'}</p><dl className="stats-grid">{[['Saved topics',saved.length],['Recent explorations',recent.length],['Saved paths',paths.length],['Topics in saved paths',pathTopics],['Longest saved path',longest]].map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl><p className="stats-note">Recent explorations counts your latest 12 distinct topics. Saved-path counts update when you save or delete a path.</p><section><div className="library-section-title"><h2>Recently explored</h2></div>{recent.length ? <div className="recent-list">{recent.map(a=><Link key={a.pageId} href={`/explore/${encodeURIComponent(a.title)}`}><strong>{a.title}</strong><span>{a.description || a.extract.slice(0,100)}</span></Link>)}</div> : <p className="library-empty">Explore a topic from <Link href="/scroll">Scroll</Link> to start your activity.</p>}</section></>}</main>;
}
