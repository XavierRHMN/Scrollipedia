'use client';
import {useI18n} from './use-i18n';
import Link from 'next/link';
import { ArrowUpRight, Bookmark, BookmarkCheck, Route, Trash2 } from 'lucide-react';
import { useLibrary } from './library-provider';
import { Button } from './ui/button';
import { exploreUrl } from '@/lib/trail';
import {articleKey,articleLanguage} from '@/lib/languages';
import { WikiImage } from './wiki-image';
export function Library() {
  const {t,language}=useI18n();
  const { saved, paths, ready, notice, toggle, removePath } = useLibrary();
  return <main className="library-page">
    <header className="page-heading library-heading"><h1>{t("Library")}</h1><span>{t("Your saved discoveries")}</span></header>
    {notice && <p role="status" className="storage-notice">{notice}</p>}
    {!ready ? <p className="library-empty">{t("Loading your library…")}</p> : <div className="library-content">
      <section aria-labelledby="saved-topics-heading">
        <div className="library-section-heading"><h2 id="saved-topics-heading">{t("Saved topics")}</h2><span>{saved.length}</span></div>
        {saved.length ? <div className="library-list">{saved.map(article=><article className="saved-topic" key={articleKey(article)}>
          <Link className="saved-topic-link" href={exploreUrl(article.title,[],articleLanguage(article))}>
            <span className="saved-topic-thumbnail" aria-hidden="true"><Bookmark size={20}/>{article.thumbnail && <WikiImage src={article.thumbnail} fallbackSrc={article.originalImage} alt="" width={52} height={52} sizes="52px" unoptimized className="saved-topic-image"/>}</span>
            <div><h2>{article.title}</h2>{article.description && <p>{article.description}</p>}</div>
          </Link>
          <button className="library-icon-action saved-topic-remove" aria-label={t('Unsave {title}',{title:article.title})} onClick={()=>toggle(article)}><BookmarkCheck size={19}/></button>
        </article>)}</div> : <div className="library-blank"><Bookmark size={26}/><h3>{t("No saved topics yet")}</h3><p>{t("Bookmark a topic from Scroll to keep it here.")}</p><Button asChild variant="outline"><Link href="/scroll">{t("Explore topics")} <ArrowUpRight size={15}/></Link></Button></div>}
      </section>
      {paths.length>0 && <section className="library-paths" aria-labelledby="saved-paths-heading">
        <div className="library-section-heading"><h2 id="saved-paths-heading">{t("Saved paths")}</h2><span>{paths.length}</span></div>
        <div className="path-list">{paths.map(path=>{
          const first=path.articles[0], last=path.articles[path.articles.length-1];
          if(!first || !last)return null;
          return <article className="path-card" key={path.id}>
            <Link className="saved-path-link" href={exploreUrl(last.title,path.articles,articleLanguage(last))} aria-label={t('Reopen {count}-topic path',{count:path.articles.length})}>
              <span className="saved-path-icon" aria-hidden="true"><Route size={20}/></span>
              <div><h3>{first.title}</h3><span>{t(path.articles.length===1 ? '{count} topic' : '{count} topics',{count:path.articles.length})}{path.articles.length>1 && <> · {t('to {title}',{title:last.title})}</>}</span></div>
            </Link>
            <button className="library-icon-action" aria-label={t('Delete path starting at {title}',{title:first.title})} onClick={()=>removePath(path.id)}><Trash2 size={18}/></button>
          </article>;
        })}</div>
      </section>}
      <footer className="library-footer">{t("Wikipedia content · CC BY-SA 4.0")}</footer>
    </div>}
  </main>;
}
