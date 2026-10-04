import { test } from 'node:test';
import assert from 'node:assert/strict';
import { groundedOrder } from '../lib/organize';
import type { RelatedTopic } from '../types';
const candidates: RelatedTopic[] = Array.from({length:8},(_,i) => ({pageId:i+1,title:`Topic ${i}`,extract:'Source content',url:'https://en.wikipedia.org/wiki/Topic',reason:'Linked in this article'}));
test('Gemini cannot insert unsupported or duplicate topics into the graph', () => {
  const result = groundedOrder(['Invented topic','Topic 3','Topic 3','Topic 1',null,8],candidates);
  assert.deepEqual(result.map(r => r.title),['Topic 3','Topic 1','Topic 0','Topic 2','Topic 4','Topic 5']);
  assert.equal(new Set(result.map(r => r.pageId)).size,6);
});
test('Malformed organization falls back to source topics', () => {
  assert.deepEqual(groundedOrder({titles:[]},candidates),candidates.slice(0,6));
  assert.deepEqual(groundedOrder([],[]),[]);
});
