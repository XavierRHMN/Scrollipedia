import type {WikiArticle} from '@/types';
import {shortRead} from './short-read';
// Gemini can select only real candidates; preserve room for fresh discoveries.
export function applyFeedRanking(output:unknown,candidates:WikiArticle[],discoveryIds:number[]):WikiArticle[] {
  const entries=Array.isArray(output) ? output : [];
  const pool=new Map(candidates.map(a=>[a.pageId,a]));
  const summaries=new Map<number,string>(), ranked:number[]=[];
  for(const entry of entries) {
    if(!entry || typeof entry!=='object') continue;
    const {pageId,summary}=entry as {pageId:unknown;summary:unknown};
    if(typeof pageId!=='number' || !pool.has(pageId) || ranked.includes(pageId)) continue;
    ranked.push(pageId);
    if(typeof summary==='string' && summary.trim().length>10 && summary.length<=1000) summaries.set(pageId,shortRead(summary));
  }
  const fresh=new Set(discoveryIds);
  const relevant=(ranked.length ? ranked : [...pool.keys()]).filter((id,i,a)=>!fresh.has(id)&&a.indexOf(id)===i).slice(0,4);
  const discoveries=[...ranked,...discoveryIds].filter((id,i,a)=>fresh.has(id)&&pool.has(id)&&a.indexOf(id)===i);
  const ids=[...relevant,...discoveries].slice(0,6);
  for(const id of pool.keys()) if(ids.length<6 && !ids.includes(id)) ids.push(id);
  return ids.map(id=>({...pool.get(id)!,...(summaries.has(id) ? {feedSummary:summaries.get(id),summarySource:'gemini' as const} : {})}));
}
