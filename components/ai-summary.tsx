'use client';
import {useEffect, useRef, useState} from 'react';
import {Sparkles, LoaderCircle} from 'lucide-react';
export function AiSummary({title}:{title:string}) {
  const [open,setOpen]=useState(false), [summary,setSummary]=useState(''), [loading,setLoading]=useState(false), [error,setError]=useState('');
  const controller=useRef<AbortController | null>(null);
  useEffect(()=>()=>controller.current?.abort(),[]);
  async function show() {
    setOpen(v=>!v);
    if (summary || loading || open) return;
    setLoading(true);setError('');
    const request=new AbortController();controller.current=request;
    try {
      const response=await fetch('/api/gemini',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({title,action:'summary'}),signal:request.signal});
      const data=await response.json();
      if (!response.ok || typeof data.summary !== 'string') throw new Error(data.error || 'Could not generate a summary.');
      setSummary(data.summary);
    } catch(e) {if(!request.signal.aborted) setError(e instanceof Error ? e.message : 'Could not generate a summary.');}
    finally {if(!request.signal.aborted) setLoading(false);}
  }
  return <section className="ai-summary"><button className="summary-pill" aria-expanded={open} aria-controls="ai-summary-content" onClick={show}>{loading ? <LoaderCircle size={16} className="spin"/> : <Sparkles size={16}/>}AI summary</button>{open && <div id="ai-summary-content" role="status"><p>{loading ? 'Summarizing this topic…' : error || summary}</p>{error ? <button className="summary-retry" onClick={()=>{setOpen(false);}}>Close and try again</button> : !loading && <span className="eyebrow">Generated with Gemini from the Wikipedia introduction. Check the article for details.</span>}</div>}</section>;
}
