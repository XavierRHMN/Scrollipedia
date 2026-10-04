import { NextResponse } from 'next/server';
import { feed, articles } from '@/lib/wikipedia';
import { getTopic } from '@/lib/topic';
import { validTitle, apiError } from '@/lib/api';
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  try {
    if (params.has('titles')) { const titles = params.getAll('titles'); if (titles.length > 12 || !titles.every(validTitle)) return NextResponse.json({ error: 'Invalid topic titles' }, { status: 400 }); return NextResponse.json({ articles: await articles(titles) }); }
    if (params.has('title')) { const title = params.get('title'); if (!validTitle(title)) return NextResponse.json({ error: 'Invalid topic title' }, { status: 400 }); return NextResponse.json(await getTopic(title)); }
    const offset = Number(params.get('offset') || 0);
    if (!Number.isInteger(offset) || offset < 0 || offset > 10000) return NextResponse.json({ error: 'Invalid feed offset' }, { status: 400 });
    const rawExclude = params.get('exclude') || '';
    if (rawExclude && !/^\d+(,\d+)*$/.test(rawExclude)) return NextResponse.json({error:'Invalid article IDs'}, {status:400});
    const exclude = rawExclude ? rawExclude.split(',').map(Number) : [];
    if (exclude.length > 200 || exclude.some(id => !Number.isSafeInteger(id) || id <= 0)) return NextResponse.json({error:'Invalid article IDs'}, {status:400});
    return NextResponse.json(await feed(offset,exclude), { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return apiError(error); }
}
