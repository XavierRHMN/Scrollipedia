import { NextResponse } from 'next/server';
import { wikidataRelated } from '@/lib/wikidata';
import { apiError } from '@/lib/api';
export async function GET(request: Request) { const id = new URL(request.url).searchParams.get('id'); if (!id || !/^Q\d+$/.test(id)) return NextResponse.json({ error: 'Invalid Wikidata ID' }, { status: 400 }); try { return NextResponse.json(await wikidataRelated(id)); } catch (e) { return apiError(e); } }
