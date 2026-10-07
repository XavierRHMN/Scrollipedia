'use client';
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Settings, X } from 'lucide-react';
import { useSettings } from './settings-provider';
import { useLibrary } from './library-provider';
import {useDiscovery} from './discovery-provider';
import { clearTopicMemory } from '@/lib/topic-client';
export function SettingsDialog() {
  const dialog = useRef<HTMLDialogElement>(null);
  const { preferences, ready, update, reset } = useSettings();
  const { clearData, resetRecent } = useLibrary();
  const [open, setOpen] = useState(false), [about, setAbout] = useState(false), [confirm, setConfirm] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const router = useRouter();
  const {edit,reset:resetDiscovery}=useDiscovery();
  async function toggleStorage() {
    setBusy(true); setError('');
    try { if (preferences.storeData) await clearData(true); update({ storeData: !preferences.storeData }); }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not change storage.'); }
    finally { setBusy(false); }
  }
  function freshFeed() { setTimeout(()=>window.dispatchEvent(new Event('scrollipedia:reset-feed')),0); router.push('/scroll'); }
  async function deleteData() {
    setBusy(true); setError('');
    try { await clearData(); clearTopicMemory(); resetDiscovery(true); reset(); setConfirm(false); dialog.current?.close(); freshFeed(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not delete data.'); }
    finally { setBusy(false); }
  }
  return <>
    <button className={`nav-link${open ? ' active' : ''}`} aria-label="Settings" aria-haspopup="dialog" onClick={() => { setError(''); setConfirm(false); setAbout(false); dialog.current?.showModal(); setOpen(true); }}><Settings size={23}/><span>Settings</span></button>
    <dialog ref={dialog} className="settings-dialog" aria-labelledby="settings-title" onClose={() => setOpen(false)} onClick={event => { if (event.target === event.currentTarget && !busy) dialog.current?.close(); }} onCancel={event => { if (busy) event.preventDefault(); }}>
      <div className="settings-panel"><div className="settings-heading"><h2 id="settings-title">Settings</h2><button aria-label="Close settings" disabled={busy} onClick={() => dialog.current?.close()}><X size={23}/></button></div>
      <section className="setting-row"><div className="setting-label"><h3 id="store-data-label">Store data</h3><button className="setting-switch" role="switch" aria-labelledby="store-data-label" aria-describedby="store-data-description" aria-checked={preferences.storeData} disabled={!ready || busy} onClick={toggleStorage}><span/></button></div><p id="store-data-description">Save your library and recent explorations between visits. Turning this off removes stored library data; saves remain available for this session. Display preferences are still remembered.</p></section>
      <section className="setting-row"><div className="setting-label"><h3 id="english-links-label">Open links in English Wikipedia</h3><button className="setting-switch" role="switch" aria-labelledby="english-links-label" aria-describedby="english-links-description" aria-checked={preferences.englishLinks} disabled={!ready || busy} onClick={() => update({englishLinks: !preferences.englishLinks})}><span/></button></div><p id="english-links-description">Full articles and mind maps use English Wikipedia. Feed posts use Simple Wikipedia introductions where available, with automatic Gemini simplification. Turn this off to prefer matching Simple Wikipedia links.</p></section>
      <section className="setting-row"><h3>Feed interests</h3><p>Gemini automatically ranks posts and makes them easier to read. Your interests, a few saved and explored topic titles, and article text are sent through our server to Gemini.</p><button className="settings-interest-link" onClick={()=>{dialog.current?.close();edit();}}>Choose interests</button></section><section className="setting-label theme-setting"><h3 id="theme-label">Theme</h3><div className="theme-options" role="radiogroup" aria-labelledby="theme-label">{(['auto','light','dark'] as const).map(theme => <button key={theme} role="radio" aria-checked={preferences.theme === theme} disabled={!ready || busy} onClick={() => update({theme})}>{theme[0].toUpperCase()+theme.slice(1)}</button>)}</div></section>
      {error && <p className="settings-error" role="alert">{error}</p>}
      {about && <div className="settings-about"><h3>About Scrollipedia</h3><p>Addictive learning through Wikipedia. Explore connected topics and save your discoveries. The feed mixes fresh discoveries with your chosen interests, saved topics, and recent explorations. Gemini automatically ranks real Wikipedia candidates and simplifies their introductions.</p><p>Article text comes from Wikipedia under <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noreferrer">CC BY-SA 4.0</a>. Narration uses ElevenLabs. If cloud sync is configured, stored library data also syncs to your browser’s anonymous account.</p></div>}
      <div className="settings-actions"><button className="settings-action" aria-expanded={about} onClick={() => setAbout(value => !value)}>About Scrollipedia</button><button className="settings-action danger-outline" disabled={busy} onClick={() => { resetRecent(); resetDiscovery(); clearTopicMemory(); dialog.current?.close(); freshFeed(); }}>Reset discovery</button><p className="reset-description">Clear chosen interests and recent explorations, then start a fresh feed. Saved topics and paths stay in your library and can still guide recommendations.</p>{confirm ? <div className="delete-confirm" role="group" aria-label="Confirm deletion"><p>Delete saved topics, paths, recent explorations, and settings from this browser and its connected cloud library?</p><div><button disabled={busy} onClick={() => setConfirm(false)}>Cancel</button><button className="danger-fill" disabled={busy} onClick={deleteData}>{busy ? 'Deleting…' : 'Confirm delete'}</button></div></div> : <button className="settings-action danger-fill" disabled={busy} onClick={() => setConfirm(true)}>Delete all data</button>}</div>
      </div>
    </dialog>
  </>;
}
