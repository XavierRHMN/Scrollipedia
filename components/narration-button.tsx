'use client';
import { useEffect, useRef, useState } from 'react';
import { LoaderCircle, Pause, Volume2 } from 'lucide-react';
import { Button } from './ui/button';
let activeAudio: HTMLAudioElement | null = null;
let availability: Promise<boolean | null> | null = null;
function getAvailability() {
  if (!availability) availability = fetch('/api/elevenlabs', { cache: 'no-store' }).then(async response => {
    if (!response.ok) return null;
    return (await response.json()).available === true;
  }).catch(() => { availability = null; return null; });
  return availability;
}
export function NarrationButton({ title, section }: { title: string; section?: number }) {
  const [state, setState] = useState<'idle'|'loading'|'playing'>('idle'), [error, setError] = useState('');
  const [available, setAvailable] = useState<boolean | null>(null);
  const audio = useRef<HTMLAudioElement | null>(null), url = useRef<string | null>(null), abort = useRef<AbortController | null>(null);
  useEffect(() => () => { abort.current?.abort(); audio.current?.pause(); if (url.current) URL.revokeObjectURL(url.current); }, [title, section]);
  useEffect(() => { let canceled = false; void getAvailability().then(value => { if (!canceled) setAvailable(value); }); return () => { canceled = true; }; }, []);
  async function play() {
    setError('');
    if (state === 'playing') { audio.current?.pause(); setState('idle'); return; }
    try {
      setState('loading');
      if (!audio.current) {
        abort.current = new AbortController();
        const response = await fetch('/api/elevenlabs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title, section }), signal: abort.current.signal });
        if (!response.ok) throw new Error((await response.json()).error);
        url.current = URL.createObjectURL(await response.blob()); audio.current = new Audio(url.current);
        audio.current.onended = () => setState('idle'); audio.current.onpause = () => setState('idle');
      }
      activeAudio?.pause(); activeAudio = audio.current; await audio.current.play(); setState('playing');
    } catch (e) { if (!(e instanceof DOMException && e.name === 'AbortError')) setError(e instanceof Error ? e.message : 'Audio unavailable'); setState('idle'); }
  }
  const label = available === false ? 'Narration is not configured' : state === 'playing' ? 'Pause narration' : 'Play narration';
  return <span className="narration" title={available === false ? 'Narration is not configured for this app.' : 'Listen to this topic'}><Button variant="outline" size="icon" aria-label={label} onClick={play} disabled={state === 'loading' || available === false}>{state === 'loading' ? <LoaderCircle size={19} className="spin"/> : state === 'playing' ? <Pause size={19}/> : <Volume2 size={19}/>}</Button>{error && <span role="status" className="audio-error">{error}</span>}</span>;
}
