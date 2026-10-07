import type {WikiArticle, RelatedTopic} from '@/types';
export type MapTopic = {id:string; article:WikiArticle; position:{x:number;y:number}; diameter:number; expanded:boolean};
export type MapLink = {id:string; source:string; target:string};
export type MindMap = {topics:MapTopic[]; links:MapLink[]};
const idFor = (article:WikiArticle)=>String(article.pageId);
export const TOPIC_GAP=28;
// Conservative glyph widths for the 15px system font, including wide Unicode.
// Reserve an inscribed square for the title and the action below it.
const glyphWidth=(c:string)=> /\s/u.test(c) ? 5 : /[ilI.,'!:;|]/u.test(c) ? 5 : /[MWmw@]/u.test(c) ? 15 : /[A-Z]/u.test(c) ? 11 : /[a-z0-9]/u.test(c) ? 9 : 16;
const textWidth=(text:string)=>Array.from(text).reduce((width,c)=>width+glyphWidth(c),0);
export function topicDiameter(title:string):number {
  const words=title.trim().split(/\s+/u);
  // Keep ordinary words intact; unusually long words may wrap within the circle.
  const longest=Math.max(0,...words.map(textWidth));
  const minimum=Math.max(128,Math.ceil(Math.min(160,longest)/0.64/16)*16);
  for(let diameter=minimum;;diameter+=16) {
    const width=diameter*0.64;
    let lines=1, used=0;
    for(const word of words) {
      const wordWidth=textWidth(word);
      if(used && used+5+wordWidth>width) {lines++;used=0;}
      if(wordWidth<=width) used+=(used ? 5 : 0)+wordWidth;
      else for(const c of word) {
        const next=glyphWidth(c);
        if(used+next>width) {lines++;used=0;}
        used+=next;
      }
    }
    if(lines*18.75+26<=width) return diameter;
  }
}
// Keep earlier branches fixed; find free space around the selected topic.
export function expandMap(previous:MindMap, article:WikiArticle, related:RelatedTopic[], complete=true):MindMap {
  const topics=previous.topics.map(t=>({...t})), links=[...previous.links];
  const id=idFor(article);
  let parent=topics.find(t=>t.id===id);
  if (!parent) {
    const diameter=topicDiameter(article.title);
    const position=topics.length ? {x:Math.max(...topics.map(t=>t.position.x+t.diameter/2))+diameter/2+TOPIC_GAP,y:0} : {x:0,y:0};
    parent={id,article,position,diameter,expanded:false}; topics.push(parent);
  }
  parent.article=article; parent.expanded=parent.expanded || complete;
  const start=topics.length===1 ? -Math.PI/2 : Math.atan2(parent.position.y,parent.position.x);
  related.slice(0,6).forEach((child,index)=>{
    const childId=idFor(child);
    if(childId===id) return;
    if(!topics.some(t=>t.id===childId)) {
      const diameter=topicDiameter(child.title);
      let position={x:0,y:0};
      for(let step=0;step<1000;step++) {
        const radius=(parent.diameter+diameter)/2+TOPIC_GAP+20+Math.floor(step/24)*75;
        const angle=start+index*Math.PI/3+(step%24)*Math.PI/12;
        position={x:parent.position.x+Math.cos(angle)*radius,y:parent.position.y+Math.sin(angle)*radius};
        if(topics.every(t=>Math.hypot(t.position.x-position.x,t.position.y-position.y)>=(t.diameter+diameter)/2+TOPIC_GAP)) break;
      }
      topics.push({id:childId,article:child,position,diameter,expanded:false});
    }
    const edgeId=[id,childId].sort().join(':');
    if(!links.some(e=>e.id===edgeId)) links.push({id:edgeId,source:id,target:childId});
  });
  return {topics,links};
}
