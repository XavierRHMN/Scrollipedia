import type { WikiArticle } from '@/types';
import {DEFAULT_LANGUAGE,type Language} from './languages';
export function exploreUrl(title: string, trail: Pick<WikiArticle,'title'>[] = [],language:Language=DEFAULT_LANGUAGE) {
  const suffix = trail.length > 1 ? `?trail=${encodeURIComponent(JSON.stringify(trail.map(a => a.title).slice(-12)))}` : '';
  return `/explore/${encodeURIComponent(title)}${suffix}${language!==DEFAULT_LANGUAGE ? `${suffix ? '&' : '?'}lang=${language}` : ''}`;
}
export function parseTrail(raw: string | null): string[] {
  try { const value = JSON.parse(raw || '[]'); return Array.isArray(value) ? value.filter(t => typeof t === 'string' && t.length > 0 && t.length <= 200 && !/[\x00-\x1f|]/.test(t)).slice(-12) : []; } catch { return []; }
}
