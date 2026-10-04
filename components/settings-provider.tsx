'use client';
import { createContext, useContext, useEffect, useState } from 'react';
export type Preferences = { storeData: boolean; englishLinks: boolean; theme: 'auto' | 'light' | 'dark' };
const DEFAULTS: Preferences = { storeData: true, englishLinks: true, theme: 'auto' };
const KEY = 'scrollipedia.settings.v1';
const Context = createContext<{ preferences: Preferences; ready: boolean; update: (patch: Partial<Preferences>) => void; reset: () => void } | null>(null);
export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [preferences, setPreferences] = useState(DEFAULTS), [ready, setReady] = useState(false);
  useEffect(() => {
    try {
      const value = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (value) setPreferences({ storeData: value.storeData !== false, englishLinks: value.englishLinks !== false, theme: ['auto','light','dark'].includes(value.theme) ? value.theme : 'auto' });
    } catch { /* Use defaults if preferences cannot be read. */ }
    setReady(true);
  }, []);
  useEffect(() => {
    if (!ready) return;
    document.documentElement.dataset.theme = preferences.theme;
  }, [preferences.theme, ready]);
  function update(patch: Partial<Preferences>) {
    setPreferences(previous => {
      const next = { ...previous, ...patch };
      try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* Settings still apply for this session. */ }
      return next;
    });
  }
  function reset() { localStorage.removeItem(KEY); setPreferences(DEFAULTS); }
  return <Context.Provider value={{ preferences, ready, update, reset }}>{children}</Context.Provider>;
}
export function useSettings() { const value = useContext(Context); if (!value) throw new Error('Missing settings provider'); return value; }
export function useWikipediaLink() {
  const { preferences } = useSettings();
  return (article: { title: string; url: string }) => preferences.englishLinks ? article.url : `https://simple.wikipedia.org/wiki/${encodeURIComponent(article.title.replaceAll(' ','_'))}`;
}
