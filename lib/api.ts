import 'server-only';
import { NextResponse } from 'next/server';
import { hasSameOrigin } from './origin';
import { SourceError } from './http';
import {DEFAULT_LANGUAGE,type Language} from './languages';
import {translate} from './messages';
export function validTitle(value: unknown): value is string { return typeof value === 'string' && value.trim().length > 0 && value.length <= 200 && !/[\x00-\x1f|]/.test(value); }
export function apiError(error: unknown,language:Language=DEFAULT_LANGUAGE) {
  console.error('Source request failed:', error instanceof Error ? error.message : 'unknown');
  if (error instanceof SourceError && error.status === 429) {
    const retryAfter = error.retryAfter || 5;
    return NextResponse.json({ error: `${translate(language,'Wikipedia is temporarily limiting requests.')} ${translate(language,'Try again in {seconds}s',{seconds:retryAfter})}`, retryAfter }, { status: 429, headers: { 'Retry-After': String(retryAfter), 'Cache-Control': 'no-store' } });
  }
  if(error instanceof Error && error.message===translate(language,'Article language unavailable'))return NextResponse.json({error:error.message},{status:404});
  return NextResponse.json({ error: translate(language,'Wiki busy') }, { status: 502 });
}
// Per-instance abuse protection; also enable deployment protection for public demos.
const requests = new Map<string, { count: number; until: number }>();
export function allowPaidRequest(request: Request): boolean {
  if (!hasSameOrigin(request)) return false;
  const now = Date.now();
  for (const [key, value] of requests) if (value.until < now) requests.delete(key);
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 'local';
  const current = requests.get(ip) || { count: 0, until: now + 60000 };
  current.count++; requests.set(ip, current);
  return current.count <= 12;
}
