import {test} from 'node:test';
import assert from 'node:assert/strict';
import {expandMap,topicDiameter,TOPIC_GAP} from '../lib/mind-map';
const article=(id:number)=>({pageId:id,title:`Topic ${id}`,extract:'A Wikipedia topic.',url:`https://en.wikipedia.org/wiki/Topic_${id}`});
const related=(...ids:number[])=>ids.map(id=>({...article(id),reason:'Linked article'}));
test('expansion preserves earlier branches, deduplicates cycles and keeps circles apart',()=>{
  const first=expandMap({topics:[],links:[]},article(1),related(2,3,4,5,6,7));
  let map=expandMap(first,article(2),related(1,8,9,10,11,12));
  for(let i=8;i<30;i++) map=expandMap(map,article(i),related(i+10,i+11,i+12));
  for(const t of first.topics) assert.deepEqual(map.topics.find(n=>n.id===t.id)?.position,t.position);
  assert.equal(new Set(map.topics.map(t=>t.id)).size,map.topics.length);
  assert.equal(new Set(map.links.map(t=>t.id)).size,map.links.length);
  for(let i=0;i<map.topics.length;i++) for(let j=i+1;j<map.topics.length;j++) assert.ok(Math.hypot(map.topics[i].position.x-map.topics[j].position.x,map.topics[i].position.y-map.topics[j].position.y)>=(map.topics[i].diameter+map.topics[j].diameter)/2+TOPIC_GAP-0.01);
  assert.ok(map.topics.find(t=>t.id==='2')?.expanded);
});

test('long titles grow circles and leave space for differently sized branches',()=>{
  const longTitle='International Bureau of Weights and Measures and the International System of Quantities';
  assert.equal(topicDiameter('Mass'),128);
  assert.ok(topicDiameter(longTitle)>topicDiameter('Mass'));
  assert.ok(topicDiameter('W'.repeat(200))>topicDiameter(longTitle));
  const children=related(2,3,4,5,6,7).map((t,i)=>({...t,title:i%2 ? longTitle.repeat(i) : t.title}));
  const first=expandMap({topics:[],links:[]},article(1),children);
  const map=expandMap(first,children[0],children.map(t=>({...t,pageId:t.pageId+10})));
  for(const t of first.topics) assert.deepEqual(map.topics.find(n=>n.id===t.id),t.id==='2' ? {...t,expanded:true} : t);
  for(let i=0;i<map.topics.length;i++) for(let j=i+1;j<map.topics.length;j++) {
    const a=map.topics[i],b=map.topics[j];
    assert.ok(Math.hypot(a.position.x-b.position.x,a.position.y-b.position.y)>=(a.diameter+b.diameter)/2+TOPIC_GAP-0.01);
  }
});
