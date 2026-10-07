import type { TopicDetail, WikiArticle } from '@/types';
import {DEFAULT_LANGUAGE,LANGUAGES,articleLanguage,type Language} from './languages';
const articles = new Map<string,WikiArticle>();
const details = new Map<string,TopicDetail>();
export function clearTopicMemory() { articles.clear(); details.clear(); }
const key = (title: string,language:Language) => `${language}:${title.replaceAll('_',' ').trim().toLocaleLowerCase(language)}`;
export function rememberArticle(article: WikiArticle) {
  articles.set(key(article.title,articleLanguage(article)),article);
  if (articles.size > 150) articles.delete(articles.keys().next().value!);
}
export function rememberTopic(topic: TopicDetail) {
  rememberArticle(topic.article); topic.related.forEach(rememberArticle);
  if (!topic.sourceWarning) { details.set(key(topic.article.title,articleLanguage(topic.article)),topic); if (details.size > 50) details.delete(details.keys().next().value!); }
}
export function knownClientTopic(title: string,language:Language=DEFAULT_LANGUAGE): TopicDetail | null {
  const detail = details.get(key(title,language)); if (detail) return detail;
  const article = articles.get(key(title,language));
  return article ? { article, sections: [{title:LANGUAGES[language].overview,content:article.extract}], related: [], organized: false } : null;
}
