import { test } from 'node:test';
import assert from 'node:assert/strict';
import { routeTitle } from '../lib/wiki-title';
test('multi-word graph routes produce a plain Wikipedia title',()=>{
  assert.equal(routeTitle('Physical%20quantity'),'Physical quantity');
  assert.equal(routeTitle('Adenosine_triphosphate'),'Adenosine triphosphate');
});
test('Unicode, literal percent, and punctuation round-trip without double encoding',()=>{
  for (const title of ['Björk','100% Pure','Action (physics)','Rock & roll']) assert.equal(routeTitle(encodeURIComponent(title)),title);
  assert.equal(routeTitle('Bad%escape'),'Bad%escape');
});
