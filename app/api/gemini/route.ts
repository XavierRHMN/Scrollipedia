import { NextResponse } from 'next/server';
import { getOrganizedTopic } from '@/lib/topic';
import { validTitle, apiError, allowPaidRequest } from '@/lib/api';
export async function POST(request: Request) {
  if (!allowPaidRequest(request)) return NextResponse.json({ error: 'Please wait before making another AI request.' }, { status: 429 });
  try {
    const { title } = await request.json();
    if (!validTitle(title)) return NextResponse.json({ error: 'Invalid topic title' }, { status: 400 });
    const topic = await getOrganizedTopic(title);
    return NextResponse.json({ related: topic.related, organized: topic.organized });
  } catch (e) { return apiError(e); }
}
