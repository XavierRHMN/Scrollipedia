import 'server-only';
import { WikimediaClient } from './wikimedia-client';
export { SourceError } from './wikimedia-client';
const userAgent = process.env.WIKIMEDIA_USER_AGENT || 'Scrollipedia/1.0';
const identified = /https?:\/\/|[\w.+-]+@[\w.-]+\.[a-z]{2,}/i.test(userAgent);
const wikimedia = new WikimediaClient({ userAgent, minTime: identified ? 400 : 6500 });
export async function externalJson<T>(url: string, init: RequestInit = {}, seconds = 12): Promise<T> {
  const host = new URL(url).hostname;
  if ((!init.method || init.method === 'GET') && (host.endsWith('.wikipedia.org') || host.endsWith('.wikidata.org'))) return wikimedia.json<T>(url,init,seconds);
  // Paid provider POSTs stay outside the Wikimedia queue and are never retried.
  const response = await fetch(url,{...init,signal:AbortSignal.timeout(seconds*1000)});
  if (!response.ok) throw new Error(`Source returned ${response.status}`);
  return response.json() as Promise<T>;
}
