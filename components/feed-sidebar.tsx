'use client';
import Link from 'next/link';
import { useLibrary } from './library-provider';
export function FeedSidebar() {
  const { saved, recent } = useLibrary();
  return <aside className="feed-sidebar" aria-label="Your library"><section><h2>Saved topics</h2>{saved.length ? <ul>{saved.slice(0,5).map(a => <li key={a.pageId}><Link href={`/explore/${encodeURIComponent(a.title)}`}>{a.title}</Link></li>)}</ul> : <p>Save a topic to find it here later.</p>}<Link className="sidebar-link" href="/library">Open Library</Link></section>{recent.length > 0 && <section><h2>Recently explored</h2><ul>{recent.slice(0,4).map(a => <li key={a.pageId}><Link href={`/explore/${encodeURIComponent(a.title)}`}>{a.title}</Link></li>)}</ul></section>}<p className="sidebar-credit">Articles from Wikipedia.<br/>Text licensed under <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noreferrer">CC BY-SA 4.0</a>.</p></aside>;
}
