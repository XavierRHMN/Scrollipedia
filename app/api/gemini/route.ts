import { NextResponse } from 'next/server';
import { getOrganizedTopic } from '@/lib/topic';
import { validTitle, apiError, allowPaidRequest } from '@/lib/api';
import {DEFAULT_LANGUAGE,isLanguage} from '@/lib/languages';
export async function POST(request: Request) {
  if (!allowPaidRequest(request)) return NextResponse.json({ error: 'Please wait before making another AI request.' }, { status: 429 });
  try {
    const { title,language=DEFAULT_LANGUAGE } = await request.json();
    if (!validTitle(title) || !isLanguage(language)) return NextResponse.json({ error: 'Invalid topic title or language' }, { status: 400 });
    const topic = await getOrganizedTopic(title,language);
    return NextResponse.json({ related: topic.related, organized: topic.organized });
  } catch (e) { return apiError(e); }
}
