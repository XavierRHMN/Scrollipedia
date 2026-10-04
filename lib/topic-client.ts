import type { TopicDetail, WikiArticle } from '@/types';
const articles = new Map<string,WikiArticle>();
const details = new Map<string,TopicDetail>();
export function clearTopicMemory() { articles.clear(); details.clear(); }
const key = (title: string) => title.replaceAll('_',' ').trim().toLocaleLowerCase('en');
export function rememberArticle(article: WikiArticle) {
  articles.set(key(article.title),article);
  if (articles.size > 150) articles.delete(articles.keys().next().value!);
}
export function rememberTopic(topic: TopicDetail) {
  rememberArticle(topic.article); topic.related.forEach(rememberArticle);
  if (!topic.sourceWarning) { details.set(key(topic.article.title),topic); if (details.size > 50) details.delete(details.keys().next().value!); }
}
export function knownClientTopic(title: string): TopicDetail | null {
  const detail = details.get(key(title)); if (detail) return detail;
  const article = articles.get(key(title));
  return article ? { article, sections: [{title:'Overview',content:article.extract}], related: [], organized: false } : null;
}
