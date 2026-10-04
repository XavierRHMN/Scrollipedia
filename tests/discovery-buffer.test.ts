import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DiscoveryBuffer } from '../lib/discovery-buffer';
import type { WikiArticle } from '../types';
const batch = Array.from({length:16},(_,i):WikiArticle => ({pageId:i+1,title:`Article ${i+1}`,extract:'Source summary',url:`https://en.wikipedia.org/wiki/Article_${i+1}`}));
test('discovery keeps unused source articles instead of fetching again for each six-post batch',async () => {
  let calls = 0;
  const buffer = new DiscoveryBuffer(async () => {calls++;return batch;});
  const first = await buffer.take(), second = await buffer.take(first.articles.map(a => a.pageId));
  assert.equal(calls,1); assert.equal(first.articles.length,6); assert.equal(second.articles.length,6);
  assert.ok(second.articles.every(a => !first.articles.some(b => b.pageId === a.pageId)));
});
test('simultaneous feed requests share a refill and take distinct batches',async () => {
  let calls = 0;
  const buffer = new DiscoveryBuffer(async () => {calls++; await new Promise(resolve=>setTimeout(resolve,10)); return batch;});
  const [first,second] = await Promise.all([buffer.take(),buffer.take()]);
  assert.equal(calls,1); assert.ok(second.articles.every(a => !first.articles.some(b=>b.pageId === a.pageId)));
});
test('rate-limit fallback uses only known articles and excludes articles the reader already saw',async () => {
  let calls = 0;
  const buffer = new DiscoveryBuffer(async () => {if (++calls > 1) throw new Error('429'); return batch;});
  await buffer.take(); await buffer.take();
  const fallback = await buffer.take([1,2,3,4,5,6]);
  assert.ok(fallback.sourceWarning); assert.ok(fallback.articles.every(a=>a.pageId > 6));
  await assert.rejects(buffer.take(batch.map(a=>a.pageId)),/429/);
});
