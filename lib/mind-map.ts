import type {WikiArticle, RelatedTopic} from '@/types';
export type MapTopic = {id:string; article:WikiArticle; position:{x:number;y:number}; expanded:boolean};
export type MapLink = {id:string; source:string; target:string};
export type MindMap = {topics:MapTopic[]; links:MapLink[]};
const idFor = (article:WikiArticle)=>String(article.pageId);
// Keep earlier branches fixed; find free space around the selected topic.
export function expandMap(previous:MindMap, article:WikiArticle, related:RelatedTopic[], complete=true):MindMap {
  const topics=previous.topics.map(t=>({...t})), links=[...previous.links];
  const id=idFor(article);
  let parent=topics.find(t=>t.id===id);
  if (!parent) {
    const position=topics.length ? {x:Math.max(...topics.map(t=>t.position.x))+175,y:0} : {x:0,y:0};
    parent={id,article,position,expanded:false}; topics.push(parent);
  }
  parent.article=article; parent.expanded=parent.expanded || complete;
  const start=topics.length===1 ? -Math.PI/2 : Math.atan2(parent.position.y,parent.position.x);
  related.slice(0,6).forEach((child,index)=>{
    const childId=idFor(child);
    if(childId===id) return;
    if(!topics.some(t=>t.id===childId)) {
      let position={x:0,y:0};
      for(let step=0;step<1000;step++) {
        const radius=175+Math.floor(step/24)*75;
        const angle=start+index*Math.PI/3+(step%24)*Math.PI/12;
        position={x:parent.position.x+Math.cos(angle)*radius,y:parent.position.y+Math.sin(angle)*radius};
        if(topics.every(t=>Math.hypot(t.position.x-position.x,t.position.y-position.y)>=155)) break;
      }
      topics.push({id:childId,article:child,position,expanded:false});
    }
    const edgeId=[id,childId].sort().join(':');
    if(!links.some(e=>e.id===edgeId)) links.push({id:edgeId,source:id,target:childId});
  });
  return {topics,links};
}
