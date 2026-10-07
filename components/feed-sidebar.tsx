'use client';
import {useI18n} from './use-i18n';
import Link from 'next/link';
import {articleKey,articleLanguage} from '@/lib/languages';
import {exploreUrl} from '@/lib/trail';
import { useLibrary } from './library-provider';
export function FeedSidebar() {
  const {t,language}=useI18n();
  const { saved, recent } = useLibrary();
  return <aside className="feed-sidebar" aria-label={t("Your library")}><section><h2>{t("Saved topics")}</h2>{saved.length ? <ul>{saved.slice(0,5).map(a => <li key={articleKey(a)}><Link href={exploreUrl(a.title,[],articleLanguage(a))}>{a.title}</Link></li>)}</ul> : <p>{t("Save a topic to find it here later.")}</p>}<Link className="sidebar-link" href="/library">{t("Open Library")}</Link></section>{recent.length > 0 && <section><h2>{t("Recently explored")}</h2><ul>{recent.slice(0,4).map(a => <li key={articleKey(a)}><Link href={exploreUrl(a.title,[],articleLanguage(a))}>{a.title}</Link></li>)}</ul></section>}<p className="sidebar-credit">{t("Articles from Wikipedia.")}<br/>{t("Text licensed under")} <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noreferrer">CC BY-SA 4.0</a>.</p></aside>;
}
