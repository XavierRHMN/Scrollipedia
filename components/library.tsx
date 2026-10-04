'use client';
import Link from 'next/link';
import { Route, Trash2 } from 'lucide-react';
import { useLibrary } from './library-provider';
import { Button } from './ui/button';
import { exploreUrl } from '@/lib/trail';
import { TopicPost } from './topic-post';
export function Library() {
  const { saved, recent, paths, ready, notice, removePath } = useLibrary();
  return <main className="library-page"><div className="page-heading"><h1>Library</h1><span>{saved.length} saved {saved.length === 1 ? 'topic' : 'topics'}</span></div>{notice && <p role="status" className="storage-notice">{notice}</p>}{!ready ? <p className="library-empty">Loading your library…</p> : <><section><div className="library-section-title"><h2>Saved topics</h2></div>{saved.length ? <div className="library-list">{saved.map(a => <TopicPost key={a.pageId} article={a}/>)}</div> : <div className="library-empty"><p>No saved topics yet.</p><p>Use the bookmark on any article to save it here.</p><Button asChild variant="outline"><Link href="/scroll">Back to Scroll</Link></Button></div>}</section>{paths.length > 0 && <section><div className="library-section-title"><h2>Saved paths</h2><span>{paths.length}</span></div><div className="path-list">{paths.map(path => <article className="path-card" key={path.id}><Route size={20}/><div><h3>{path.articles[0]?.title}</h3><p>{path.articles.map(a => a.title).join(' → ')}</p><Link href={exploreUrl(path.articles[path.articles.length-1].title,path.articles)}>Reopen {path.articles.length}-topic path</Link></div><button aria-label={`Delete path starting at ${path.articles[0]?.title}`} onClick={() => removePath(path.id)}><Trash2 size={18}/></button></article>)}</div></section>}{recent.length > 0 && <section><div className="library-section-title"><h2>Recent explorations</h2></div><div className="recent-list">{recent.map(a => <Link key={a.pageId} href={exploreUrl(a.title)}><strong>{a.title}</strong><span>{a.description || a.extract.slice(0,100)}</span></Link>)}</div></section>}</>}<footer className="library-footer">Wikipedia content · CC BY-SA 4.0</footer></main>;
}
