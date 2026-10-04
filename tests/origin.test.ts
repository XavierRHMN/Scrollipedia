import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hasSameOrigin } from '../lib/origin';
test('client host is respected when Next reconstructs a localhost URL', () => {
  assert.equal(hasSameOrigin(new Request('http://localhost:3000/api/elevenlabs', { headers: { host: '127.0.0.1:3000', origin: 'http://127.0.0.1:3000' } })),true);
});
test('cross-origin, missing and malformed origins are rejected', () => {
  for (const origin of ['https://unrelated.example','null','not-a-url']) assert.equal(hasSameOrigin(new Request('http://localhost:3000/api/elevenlabs', { headers: { host:'127.0.0.1:3000',origin } })),false);
  assert.equal(hasSameOrigin(new Request('http://localhost:3000/api/elevenlabs')),false);
});
test('forwarded HTTPS supports a deployed app origin', () => {
  assert.equal(hasSameOrigin(new Request('http://localhost:3000/api/elevenlabs', { headers: { host: 'scrollipedia.example', 'x-forwarded-proto': 'https', origin: 'https://scrollipedia.example' } })),true);
});
