import { test } from 'node:test';
import assert from 'node:assert/strict';
import { exploreUrl, parseTrail } from '../lib/trail';
test('exploration URL round-trips a path with punctuation and Unicode', () => {
  const titles = ['Bioluminescence','Oxygen','Björk & music'];
  const url = new URL(exploreUrl(titles[2],titles.map(title => ({title}))), 'http://localhost');
  assert.deepEqual(parseTrail(url.searchParams.get('trail')),titles);
});
test('invalid or oversized path input is bounded', () => {
  assert.deepEqual(parseTrail('{broken'),[]);
  assert.deepEqual(parseTrail('[null,12,"bad|title","Oxygen"]'),['Oxygen']);
  assert.equal(parseTrail(JSON.stringify(Array.from({length:40},(_,i)=>`Topic ${i}`))).length,12);
});
