import { test } from 'node:test';
import assert from 'node:assert/strict';
import { WikimediaClient, SourceError, retryDelay } from '../lib/wikimedia-client';
const url = 'https://en.wikipedia.org/w/api.php?title=Example';
test('identical reads coalesce, successful content is cached, and source calls are serialized',async () => {
  let calls = 0, active = 0, maxActive = 0;
  const client = new WikimediaClient({userAgent:'Scrollipedia/1.0 (mailto:test@example.org)',minTime:5,fetcher:async (_url,init) => {
    assert.match(new Headers(init?.headers).get('User-Agent')!,/test@example.org/);
    calls++; active++; maxActive = Math.max(maxActive,active);
    await new Promise(resolve => setTimeout(resolve,10)); active--;
    return Response.json({calls});
  }});
  const cache = {next:{revalidate:3600}};
  const [first, duplicate] = await Promise.all([client.json(url,cache),client.json(url,cache),client.json(url+'&other=1',cache)]);
  assert.deepEqual(first,duplicate); assert.equal(calls,2); assert.equal(maxActive,1);
  assert.deepEqual(await client.json(url,cache),first); assert.equal(calls,2);
  await client.json(url,{cache:'no-store'}); assert.equal(calls,3);
});
test('a long rate limit stops other requests too and recovers after its deadline',async () => {
  let calls = 0, now = 0;
  const client = new WikimediaClient({userAgent:'test',minTime:0,now:()=>now,maxRetryWait:0,fetcher:async () => {
    calls++;
    return calls === 1 ? new Response('',{status:429,headers:{'retry-after':'60'}}) : Response.json({ok:true});
  }});
  await assert.rejects(client.json(url),(e:unknown) => e instanceof SourceError && e.retryAfter === 60);
  await assert.rejects(client.json(url+'&other=1'),(e:unknown) => e instanceof SourceError && e.status === 429);
  assert.equal(calls,1);
  now = 61000; assert.deepEqual(await client.json(url),{ok:true}); assert.equal(calls,2);
});
test('brief source failures retry once after the full delay and do not cache failures',async () => {
  let now = 0, calls = 0; const waits:number[] = [];
  const client = new WikimediaClient({userAgent:'test',minTime:0,now:()=>now,sleep:async ms => { waits.push(ms); now += ms; },fetcher:async () => {
    calls++; return calls === 1 ? new Response('',{status:503,headers:{'retry-after':'2'}}) : Response.json({ok:true});
  }});
  assert.deepEqual(await client.json(url,{next:{revalidate:60}}),{ok:true});
  assert.equal(calls,2); assert.ok(waits[0] >= 2000);
  await client.json(url,{next:{revalidate:60}}); assert.equal(calls,2);
});
test('HTTP 200 Action API rate limits trigger the shared cooldown',async () => {
  let calls = 0;
  const client = new WikimediaClient({userAgent:'test',minTime:0,maxRetryWait:0,fetcher:async () => {calls++; return Response.json({error:{code:'ratelimited'}});}});
  await assert.rejects(client.json(url),SourceError);
  await assert.rejects(client.json(url+'&other=1'),SourceError); assert.equal(calls,1);
});
test('Retry-After supports seconds and dates, and absent or invalid values wait at least five seconds',()=>{
  assert.equal(retryDelay('60',0),60);
  assert.equal(retryDelay('Thu, 01 Jan 1970 00:01:00 GMT',0),60);
  assert.equal(retryDelay(null,0),5); assert.equal(retryDelay('invalid',0),5);
});
