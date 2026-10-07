'use client';
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { WikiArticle, ExplorationPath } from '@/types';
import { getSupabase } from '@/lib/supabase';
import { useSettings } from './settings-provider';
import {LANGUAGES,DEFAULT_LANGUAGE,articleKey,type Language} from '@/lib/languages';
type Store = { saved: WikiArticle[]; recent: WikiArticle[]; paths: ExplorationPath[] };
type LibraryContext = Store & { ready: boolean; notice: string; toggle: (a: WikiArticle) => void; visit: (a: WikiArticle) => void; savePath: (articles: WikiArticle[]) => void; removePath: (id: string) => void; isSaved: (id: number,language?:Language) => boolean; clearData: (keepSession?: boolean) => Promise<void>; resetRecent: () => void };
const EMPTY: Store = { saved: [], recent: [], paths: [] };
const KEY = 'scrollipedia.library.v1';
const Context = createContext<LibraryContext | null>(null);
function isArticle(value: unknown): value is WikiArticle { if (!value || typeof value !== 'object') return false; const a = value as WikiArticle; if(!Number.isInteger(a.pageId) || typeof a.title!=='string' || typeof a.extract!=='string' || typeof a.url!=='string')return false;try{const url=new URL(a.url);return url.protocol==='https:' && Object.values(LANGUAGES).some(l=>l.wikipediaHost===url.hostname);}catch{return false;} }
export function LibraryProvider({ children }: { children: React.ReactNode }) {
  const { preferences, ready: settingsReady } = useSettings();
  const enabled = useRef(preferences.storeData); enabled.current = preferences.storeData;
  const [store, setStore] = useState<Store>(EMPTY), [ready, setReady] = useState(false), [notice, setNotice] = useState('');
  const current = useRef(store); const user = useRef<string | null>(null); const queue = useRef(Promise.resolve()); const cloudInit = useRef(Promise.resolve());
  const sync = useCallback((next: Store) => {
    const supabase = getSupabase(); const userId = user.current;
    if (!supabase || !userId || !enabled.current) return;
    queue.current = queue.current.then(async () => {
      if (!enabled.current) return;
      const { error } = await supabase.from('libraries').upsert({ user_id: userId, data: next, updated_at: new Date().toISOString() });
      if (error) setNotice('Cloud sync is unavailable. Your library is saved on this device.');
    }).catch(() => setNotice('Cloud sync is unavailable. Your library is saved on this device.'));
  }, []);
  const commit = useCallback((transform: (s: Store) => Store) => {
    const next = transform(current.current); current.current = next; setStore(next);
    try { if (enabled.current) localStorage.setItem(KEY, JSON.stringify(next)); } catch { setNotice('This browser cannot save your library. Check that storage is allowed.'); }
    sync(next);
  }, [sync]);
  useEffect(() => {
    if (!settingsReady) return;
    try {
      const raw = enabled.current ? JSON.parse(localStorage.getItem(KEY) || 'null') : null;
      if (raw) { const next = { saved: Array.isArray(raw.saved) ? raw.saved.filter(isArticle) : [], recent: Array.isArray(raw.recent) ? raw.recent.filter(isArticle) : [], paths: Array.isArray(raw.paths) ? raw.paths.filter((p: ExplorationPath) => typeof p.id === 'string' && Array.isArray(p.articles) && p.articles.every(isArticle)) : [] }; current.current = next; setStore(next); }
    } catch { setNotice('Your saved library could not be read. New saves will start a fresh library.'); }
    setReady(true);
    let canceled = false;
    const supabase = getSupabase();
    if (supabase && enabled.current) cloudInit.current = (async () => {
      const { data } = await supabase.auth.getSession();
      let session = data.session;
      if (!session) { const result = await supabase.auth.signInAnonymously(); if (result.error) throw result.error; session = result.data.session; }
      if (!session || canceled) return;
      const { data: cloud, error } = await supabase.from('libraries').select('data').eq('user_id', session.user.id).maybeSingle();
      if (error) throw error;
      if (canceled) return;
      user.current = session.user.id;
      // Cloud is used only on a fresh device; local edits remain authoritative.
      if (!current.current.saved.length && !current.current.paths.length && cloud?.data) {
        const value = cloud.data as Store;
        commit(s => ({ ...s, saved: Array.isArray(value.saved) ? value.saved.filter(isArticle) : [], paths: Array.isArray(value.paths) ? value.paths.filter(p => Array.isArray(p.articles) && p.articles.every(isArticle)) : [] }));
      } else sync(current.current);
    })().catch(() => { if (!canceled) setNotice('Cloud sync is unavailable. Your library is saved on this device.'); });
    return () => { canceled = true; };
  }, [commit, sync, settingsReady, preferences.storeData]);
  useEffect(() => { if (ready && preferences.storeData) commit(s => s); }, [ready, preferences.storeData, commit]);
  async function clearData(keepSession = false) {
    // Finish queued writes first so they cannot restore the library after deletion.
    await cloudInit.current;
    await queue.current;
    const supabase = getSupabase();
    if (supabase) {
      const { data, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw new Error('Could not access cloud storage. Please retry.');
      const userId = user.current || data.session?.user.id;
      if (userId) {
        const { error } = await supabase.from('libraries').upsert({ user_id: userId, data: EMPTY, updated_at: new Date().toISOString() });
        if (error) throw new Error('Could not delete your cloud library. Please retry.');
      }
    }
    localStorage.removeItem(KEY);
    if (!keepSession) { current.current = EMPTY; setStore(EMPTY); }
    setNotice('');
  }
  const toggle = useCallback((article: WikiArticle) => commit(s => ({ ...s, saved: s.saved.some(a => articleKey(a)===articleKey(article)) ? s.saved.filter(a => articleKey(a)!==articleKey(article)) : [article, ...s.saved] })), [commit]);
  const visit = useCallback((article: WikiArticle) => commit(s => ({ ...s, recent: [article, ...s.recent.filter(a => articleKey(a)!==articleKey(article))].slice(0,12) })), [commit]);
  const savePath = useCallback((articles: WikiArticle[]) => commit(s => ({ ...s, paths: [{ id: crypto.randomUUID(), name: articles.map(a => a.title).join(' → '), articles, savedAt: new Date().toISOString() }, ...s.paths] })), [commit]);
  return <Context.Provider value={{ ...store, ready, notice, toggle, visit, savePath, clearData, resetRecent: () => commit(s => ({ ...s, recent: [] })), removePath: id => commit(s => ({ ...s, paths: s.paths.filter(p => p.id !== id) })), isSaved: (id,language=DEFAULT_LANGUAGE) => store.saved.some(a => articleKey(a)===`${language}:${id}`) }}>{children}</Context.Provider>;
}
export function useLibrary() { const value = useContext(Context); if (!value) throw new Error('Missing library provider'); return value; }
