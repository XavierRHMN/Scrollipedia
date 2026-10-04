import { NextResponse } from 'next/server';
import { getTopic } from '@/lib/topic';
import { validTitle, allowPaidRequest } from '@/lib/api';
import { articles, knownArticle } from '@/lib/wikipedia';
export async function GET() {
  return NextResponse.json({ available: !!process.env.ELEVENLABS_API_KEY && process.env.INTEGRATIONS_ENABLED !== 'false' }, { headers: { 'Cache-Control': 'no-store' } });
}
export async function POST(request: Request) {
  if (!process.env.ELEVENLABS_API_KEY || process.env.INTEGRATIONS_ENABLED === 'false') return NextResponse.json({ error: 'Narration is not configured for this app.' }, { status: 503 });
  if (!allowPaidRequest(request)) return NextResponse.json({ error: 'Please wait before playing another narration.' }, { status: 429 });
  try {
    const { title, section } = await request.json();
    if (!validTitle(title) || (section !== undefined && (!Number.isInteger(section) || section < 0 || section > 7))) return NextResponse.json({ error: 'Invalid narration request' }, { status: 400 });
    const topic = section === undefined ? null : await getTopic(title);
    const article = topic?.article || knownArticle(title) || (await articles([title]))[0];
    if (!article) return NextResponse.json({error:'Article not found'}, {status:404});
    const text = section === undefined ? article.extract : topic?.sections[section]?.content;
    if (!text) return NextResponse.json({ error: 'Section not found' }, { status: 404 });
    const voice = process.env.ELEVENLABS_VOICE_ID || 'JBFqnCBsd6RMkjVDRZzb';
    const model = process.env.ELEVENLABS_MODEL || 'eleven_flash_v2_5';
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voice)}`, { method: 'POST', headers: { 'xi-api-key': process.env.ELEVENLABS_API_KEY, 'Content-Type': 'application/json' }, body: JSON.stringify({ text: `${article.title}. ${text.slice(0,2500)}`, model_id: model }), signal: AbortSignal.timeout(20000) });
    if (!response.ok) throw new Error('Narration provider unavailable');
    return new Response(await response.arrayBuffer(), { headers: { 'Content-Type': 'audio/mpeg', 'Cache-Control': 'private, no-store' } });
  } catch { return NextResponse.json({ error: 'Narration could not be played. Please try again.' }, { status: 502 }); }
}
