import 'server-only';
import { unstable_cache } from 'next/cache';
import { articleAndLinks, articles, sections, knownArticle,matchingTitle } from './wikipedia';
import { wikidataRelated } from './wikidata';
import { organize } from './gemini';
import type { TopicDetail } from '@/types';
import {DEFAULT_LANGUAGE,LANGUAGES,type Language} from './languages';
import {translate} from './messages';
const getCompleteTopic = unstable_cache(async (title: string,language:Language): Promise<TopicDetail> => {
  const { article, links } = await articleAndLinks(title,language);
  const [sectionResult, relations] = await Promise.allSettled([sections(article.title,language), wikidataRelated(article.wikidataId,language)]);
  const structured = relations.status === 'fulfilled' ? relations.value : [];
  const candidates = [...new Set([...structured.map(r => r.title), ...links])].filter(t => t !== article.title).slice(0,18);
  const relatedArticles = await articles(candidates,language);
  const related = relatedArticles.map(a => ({ ...a, reason: structured.find(r => r.title === a.title)?.reason || 'Linked in this article' }));
  related.sort((a,b) => Number(b.reason !== 'Linked in this article') - Number(a.reason !== 'Linked in this article') || Number(!!b.thumbnail) - Number(!!a.thumbnail));
  return { article, sections: sectionResult.status === 'fulfilled' && sectionResult.value.length ? sectionResult.value : [{ title: LANGUAGES[language].overview, content: article.extract }], related, organized: false };
}, ['topic-v3-language'], { revalidate: 3600 });
export async function getTopic(title: string,language:Language=DEFAULT_LANGUAGE,source:Language=language): Promise<TopicDetail> {
  const localizedTitle=await matchingTitle(title,source,language);
  try { return await getCompleteTopic(localizedTitle,language); }
  catch (error) {
    const article = knownArticle(localizedTitle,language);
    if (!article) throw error;
    // Do not cache a transient failure as a complete graph for an hour.
    return { article, sections: [{ title: LANGUAGES[language].overview, content: article.extract }], related: [], organized: false, sourceWarning: translate(language,'Connections unavailable') };
  }
}
export const getOrganizedTopic = unstable_cache(async (title: string,language:Language=DEFAULT_LANGUAGE) => organize(await getCompleteTopic(title,language)), ['organized-topic-v4-language'], { revalidate: 3600 });
