import type { WikiArticle } from '@/types';
export function exploreUrl(title: string, trail: Pick<WikiArticle,'title'>[] = []) {
  const suffix = trail.length > 1 ? `?trail=${encodeURIComponent(JSON.stringify(trail.map(a => a.title).slice(-12)))}` : '';
  return `/explore/${encodeURIComponent(title)}${suffix}`;
}
export function parseTrail(raw: string | null): string[] {
  try { const value = JSON.parse(raw || '[]'); return Array.isArray(value) ? value.filter(t => typeof t === 'string' && t.length > 0 && t.length <= 200 && !/[\x00-\x1f|]/.test(t)).slice(-12) : []; } catch { return []; }
}
