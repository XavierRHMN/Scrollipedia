import {test} from 'node:test';
import assert from 'node:assert/strict';
import {expandMap} from '../lib/mind-map';
const article=(id:number)=>({pageId:id,title:`Topic ${id}`,extract:'A Wikipedia topic.',url:`https://en.wikipedia.org/wiki/Topic_${id}`});
const related=(...ids:number[])=>ids.map(id=>({...article(id),reason:'Linked article'}));
test('expansion preserves earlier branches, deduplicates cycles and keeps circles apart',()=>{
  const first=expandMap({topics:[],links:[]},article(1),related(2,3,4,5,6,7));
  let map=expandMap(first,article(2),related(1,8,9,10,11,12));
  for(let i=8;i<30;i++) map=expandMap(map,article(i),related(i+10,i+11,i+12));
  for(const t of first.topics) assert.deepEqual(map.topics.find(n=>n.id===t.id)?.position,t.position);
  assert.equal(new Set(map.topics.map(t=>t.id)).size,map.topics.length);
  assert.equal(new Set(map.links.map(t=>t.id)).size,map.links.length);
  for(let i=0;i<map.topics.length;i++) for(let j=i+1;j<map.topics.length;j++) assert.ok(Math.hypot(map.topics[i].position.x-map.topics[j].position.x,map.topics[i].position.y-map.topics[j].position.y)>=154.99);
  assert.ok(map.topics.find(t=>t.id==='2')?.expanded);
});
