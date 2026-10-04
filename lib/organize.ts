import type { RelatedTopic } from '@/types';
export function groundedOrder(titles: unknown, candidates: RelatedTopic[]): RelatedTopic[] {
  const byTitle = new Map(candidates.map(c => [c.title, c]));
  const selected: RelatedTopic[] = [];
  if (Array.isArray(titles)) for (const title of titles) { if (typeof title === 'string' && byTitle.has(title)) { selected.push(byTitle.get(title)!); byTitle.delete(title); } }
  return [...selected, ...byTitle.values()].slice(0, 6);
}
