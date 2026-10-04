import { NextResponse } from 'next/server';
import { getOrganizedTopic } from '@/lib/topic';
import { validTitle, apiError, allowPaidRequest } from '@/lib/api';
import { summarizeTopic } from '@/lib/gemini';
export async function POST(request: Request) {
  if (!allowPaidRequest(request)) return NextResponse.json({ error: 'Please wait before making another AI request.' }, { status: 429 });
  try {
    const { title, action } = await request.json();
    if (!validTitle(title)) return NextResponse.json({ error: 'Invalid topic title' }, { status: 400 });
    if (action === 'summary') {
      try { return NextResponse.json({summary:await summarizeTopic(title)}); }
      catch { return NextResponse.json({error:'AI summary is unavailable right now. Please try again shortly.'},{status:503}); }
    }
    const topic = await getOrganizedTopic(title);
    return NextResponse.json({ related: topic.related, organized: topic.organized });
  } catch (e) { return apiError(e); }
}
