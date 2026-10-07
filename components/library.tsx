'use client';
import Link from 'next/link';
import { ArrowUpRight, Bookmark, BookmarkCheck, Route, Trash2 } from 'lucide-react';
import { useLibrary } from './library-provider';
import { Button } from './ui/button';
import { exploreUrl } from '@/lib/trail';
import { WikiImage } from './wiki-image';
export function Library() {
  const { saved, paths, ready, notice, toggle, removePath } = useLibrary();
  return <main className="library-page">
    <header className="page-heading library-heading"><h1>Library</h1><span>Your saved discoveries</span></header>
    {notice && <p role="status" className="storage-notice">{notice}</p>}
    {!ready ? <p className="library-empty">Loading your library…</p> : <div className="library-content">
      <section aria-labelledby="saved-topics-heading">
        <div className="library-section-heading"><h2 id="saved-topics-heading">Saved topics</h2><span>{saved.length}</span></div>
        {saved.length ? <div className="library-list">{saved.map(article=><article className="saved-topic" key={article.pageId}>
          <Link className="saved-topic-link" href={exploreUrl(article.title)}>
            <span className="saved-topic-thumbnail" aria-hidden="true"><Bookmark size={20}/>{article.thumbnail && <WikiImage src={article.thumbnail} fallbackSrc={article.originalImage} alt="" width={52} height={52} sizes="52px" unoptimized className="saved-topic-image"/>}</span>
            <div><h2>{article.title}</h2>{article.description && <p>{article.description}</p>}</div>
          </Link>
          <button className="library-icon-action saved-topic-remove" aria-label={`Unsave ${article.title}`} onClick={()=>toggle(article)}><BookmarkCheck size={19}/></button>
        </article>)}</div> : <div className="library-blank"><Bookmark size={26}/><h3>No saved topics yet</h3><p>Bookmark a topic from Scroll to keep it here.</p><Button asChild variant="outline"><Link href="/scroll">Explore topics <ArrowUpRight size={15}/></Link></Button></div>}
      </section>
      {paths.length>0 && <section className="library-paths" aria-labelledby="saved-paths-heading">
        <div className="library-section-heading"><h2 id="saved-paths-heading">Saved paths</h2><span>{paths.length}</span></div>
        <div className="path-list">{paths.map(path=>{
          const first=path.articles[0], last=path.articles[path.articles.length-1];
          if(!first || !last)return null;
          return <article className="path-card" key={path.id}>
            <Link className="saved-path-link" href={exploreUrl(last.title,path.articles)} aria-label={`Reopen ${path.articles.length}-topic path`}>
              <span className="saved-path-icon" aria-hidden="true"><Route size={20}/></span>
              <div><h3>{first.title}</h3><span>{path.articles.length} {path.articles.length===1 ? 'topic' : 'topics'}{path.articles.length>1 && <> · to {last.title}</>}</span></div>
            </Link>
            <button className="library-icon-action" aria-label={`Delete path starting at ${first.title}`} onClick={()=>removePath(path.id)}><Trash2 size={18}/></button>
          </article>;
        })}</div>
      </section>}
      <footer className="library-footer">Wikipedia content · CC BY-SA 4.0</footer>
    </div>}
  </main>;
}
