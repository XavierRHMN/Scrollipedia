'use client';
import {useI18n} from './use-i18n';
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
  const { saved, recent } = useLibrary();
  const exploreHref = recent[0] ? exploreUrl(recent[0].title,[],articleLanguage(recent[0])) : exploreUrl(LANGUAGES[language].defaultTopic,[],language);
  return <header className="app-header"><Link href="/scroll" className="brand" aria-label={t("Scrollipedia home")}><Orbit size={30}/><span>Scrollipedia</span></Link><nav aria-label={t("Main navigation")}>
    {[{ name: 'Scroll', href: '/scroll', icon: Layers }, { name: 'Explore', href: exploreHref, icon: Compass }, { name: 'Library', href: '/library', icon: Bookmark }, { name: 'Stats', href: '/stats', icon: ChartNoAxesColumn }].map(({ name, href, icon: Icon }) => <Link key={name} href={href} aria-current={path.startsWith('/' + name.toLowerCase()) ? 'page' : undefined} className={path.startsWith('/' + name.toLowerCase()) ? 'nav-link active' : 'nav-link'}><Icon size={23}/><span>{t(name as Message)}</span>{name === 'Library' && saved.length > 0 && <span className="nav-count">{saved.length}</span>}</Link>)}
    <SettingsDialog/>
  </nav></header>;
}
