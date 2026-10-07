import {test} from 'node:test';
import assert from 'node:assert/strict';
import {applyFeedRanking} from '../lib/feed-ranking';
import {shortRead} from '../lib/short-read';
import {validFeedProfile} from '../lib/feed-profile';
const candidates=Array.from({length:10},(_,i)=>({pageId:i+1,title:`Article ${i+1}`,extract:'A real Wikipedia introduction.',url:'https://en.wikipedia.org/wiki/Test'}));
test('AI ranking keeps genuine IDs, rejects duplicates, bounds summaries and preserves discovery',()=>{
  const summary=Array(90).fill('word').join(' ');
  const output=[{pageId:999,summary:'Invented topic.'},{pageId:7,summary},{pageId:7,summary:'Duplicate.'},{pageId:8,summary:'A plain explanation of this source.'},{pageId:9,summary:'Another explanation.'},{pageId:10,summary:'A last explanation.'},{pageId:1,summary:'Fresh source.'},{pageId:2,summary:'Fresh source two.'}];
  const selected=applyFeedRanking(output,candidates,[1,2,3,4,5,6]);
  assert.equal(selected.length,6);assert.equal(new Set(selected.map(a=>a.pageId)).size,6);
  assert.ok(selected.every(a=>a.pageId<=10));assert.ok(selected.filter(a=>a.pageId<=6).length>=2);
  assert.ok(selected[0].feedSummary!.split(/\s+/).length<=45);
  assert.deepEqual(applyFeedRanking([{pageId:1,summary:'A fresh source.'},{pageId:2,summary:'Another fresh source.'}],candidates,[1,2,3,4,5,6]).map(a=>a.pageId),[1,2,3,4,5,6]);
});
test('short reads respect sentences and bound lengthy first sentences',()=>{
  assert.equal(shortRead('Cats are mammals. They often live with people. Third sentence stays out.'),'Cats are mammals. They often live with people.');
  assert.ok(shortRead(Array(100).fill('long').join(' ')).split(/\s+/).length<=45);
  assert.equal(shortRead('Petra (US: /pronunciation/) is a city. It is ancient.'),'Petra is a city. It is ancient.');
});
test('feed preferences accept bounded titles and reject oversized or injected API fields',()=>{
  assert.ok(validFeedProfile({interests:['Space'],saved:['Black hole'],explored:['Acceleration']}));
  assert.equal(validFeedProfile({interests:Array(9).fill('Space'),saved:[],explored:[]}),false);
  assert.equal(validFeedProfile({interests:['bad|title'],saved:[],explored:[]}),false);
});
