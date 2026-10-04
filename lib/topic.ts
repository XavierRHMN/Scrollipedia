import 'server-only';
import { unstable_cache } from 'next/cache';
import { articleAndLinks, articles, sections, knownArticle } from './wikipedia';
import { wikidataRelated } from './wikidata';
import { organize } from './gemini';
import type { TopicDetail } from '@/types';
const getCompleteTopic = unstable_cache(async (title: string): Promise<TopicDetail> => {
  const { article, links } = await articleAndLinks(title);
  const [sectionResult, relations] = await Promise.allSettled([sections(article.title), wikidataRelated(article.wikidataId)]);
  const structured = relations.status === 'fulfilled' ? relations.value : [];
  const candidates = [...new Set([...structured.map(r => r.title), ...links])].filter(t => t !== article.title).slice(0,18);
  const relatedArticles = await articles(candidates);
  const related = relatedArticles.map(a => ({ ...a, reason: structured.find(r => r.title === a.title)?.reason || 'Linked in this article' }));
  related.sort((a,b) => Number(b.reason !== 'Linked in this article') - Number(a.reason !== 'Linked in this article') || Number(!!b.thumbnail) - Number(!!a.thumbnail));
  return { article, sections: sectionResult.status === 'fulfilled' && sectionResult.value.length ? sectionResult.value : [{ title: 'Overview', content: article.extract }], related, organized: false };
}, ['topic-v2'], { revalidate: 3600 });
export async function getTopic(title: string): Promise<TopicDetail> {
  try { return await getCompleteTopic(title); }
  catch (error) {
    const article = knownArticle(title);
    if (!article) throw error;
    // Do not cache a transient failure as a complete graph for an hour.
    return { article, sections: [{ title: 'Overview', content: article.extract }], related: [], organized: false, sourceWarning: 'Wikipedia could not refresh the connections. You can read the summary and retry.' };
  }
}
export const getOrganizedTopic = unstable_cache(async (title: string) => organize(await getCompleteTopic(title)), ['organized-topic-v2'], { revalidate: 3600 });
