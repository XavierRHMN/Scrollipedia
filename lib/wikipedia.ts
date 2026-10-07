import 'server-only';
import { load } from 'cheerio';
import { externalJson } from './http';
import { DiscoveryBuffer } from './discovery-buffer';
import type { WikiArticle, ArticleSection } from '@/types';
const API = 'https://en.wikipedia.org/w/api.php';
type Page = { pageid: number; title: string; missing?: boolean; extract?: string; thumbnail?: { source: string }; original?: { source: string }; fullurl?: string; description?: string; pageprops?: { wikibase_item?: string }; links?: { title: string; ns: number }[] };
export async function wikiQuery<T>(params: Record<string, string>): Promise<T> {
  const cache = params.generator === 'random' ? { cache: 'no-store' as const } : { next: { revalidate: 3600 } };
  const result = await externalJson<T & { error?: { info: string } }>(`${API}?${new URLSearchParams({ action: 'query', format: 'json', formatversion: '2', ...params })}`, cache);
  if (result.error) throw new Error(result.error.info);
  return result;
}
const knownArticles = new Map<string, WikiArticle>();
const titleKey = (title: string) => title.replaceAll('_',' ').trim().toLocaleLowerCase('en');
export function knownArticle(title: string) { return knownArticles.get(titleKey(title)); }
export function rememberFeedArticle(article:WikiArticle) {
  knownArticles.set(titleKey(article.title),article);
  if(knownArticles.size>250) knownArticles.delete(knownArticles.keys().next().value!);
}
export function toArticle(page: Page): WikiArticle {
  const article = { pageId: page.pageid, title: page.title, extract: page.extract || '', thumbnail: page.thumbnail?.source || page.original?.source, originalImage: page.original?.source, description: page.description, url: page.fullurl || `https://en.wikipedia.org/wiki/${encodeURIComponent(page.title.replaceAll(' ', '_'))}`, wikidataId: page.pageprops?.wikibase_item };
  if (article.extract) { knownArticles.set(titleKey(article.title),article); if (knownArticles.size > 250) knownArticles.delete(knownArticles.keys().next().value!); }
  return article;
}
export async function articles(titles: string[]): Promise<WikiArticle[]> {
  if (!titles.length) return [];
  const result = await wikiQuery<{ query: { pages: Page[] } }>({ titles: titles.slice(0, 20).join('|'), redirects: '1', prop: 'extracts|pageimages|info|pageprops|description', exintro: '1', explaintext: '1', exsentences: '4', piprop: 'thumbnail|original', pithumbsize: '960', inprop: 'url' });
  return result.query.pages.filter(p => !p.missing && p.pageid > 0 && p.extract).map(toArticle);
}
export async function articleAndLinks(title: string) {
  const result = await wikiQuery<{ query: { pages: Page[] } }>({ titles: title, redirects: '1', prop: 'extracts|pageimages|info|pageprops|description|links', exintro: '1', explaintext: '1', exsentences: '6', piprop: 'thumbnail|original', pithumbsize: '960', inprop: 'url', plnamespace: '0', pllimit: '100' });
  const page = result.query.pages[0];
  if (!page || page.missing || !page.extract) throw new Error('Article not found');
  return { article: toArticle(page), links: (page.links || []).map(l => l.title).filter(t => !/^(List of|Index of|Outline of|Wikipedia|Help:)/.test(t)) };
}
export async function sections(title: string): Promise<ArticleSection[]> {
  const result = await externalJson<{ parse?: { text: string } }>(`${API}?${new URLSearchParams({ action: 'parse', page: title, prop: 'text', format: 'json', formatversion: '2', disableeditsection: '1' })}`, { next: { revalidate: 3600 } });
  if (!result.parse) return [];
  const $ = load(result.parse.text);
  $('script,style,table,sup,.mw-editsection,.navbox,.reflist,.metadata,.hatnote,.thumb,.sidebar,figure').remove();
  const output: ArticleSection[] = [];
  let current: ArticleSection = { title: 'Overview', content: '' };
  $('.mw-parser-output').first().children().each((_, element) => {
    const item = $(element);
    const heading = item.is('h2') ? item : item.find('h2').first();
    if (heading.length) { if (current.content) output.push(current); current = { title: heading.text().replace(/\[edit\]/g, '').trim(), content: '' }; }
    else if (item.is('p') && current.content.length < 3200) { const text = item.text().replace(/\[\d+\]/g, '').trim(); if (text) current.content += `${current.content ? '\n\n' : ''}${text}`; }
  });
  if (current.content) output.push(current);
  return output.filter(s => !/References|External links|Further reading|See also|Notes|Bibliography/i.test(s.title)).slice(0, 8);
}
async function discoveryBatch(attempt=0):Promise<WikiArticle[]> {
  const random = await wikiQuery<{ query: { pages: Page[] } }>({ generator: 'random', grnnamespace: '0', grnlimit: '32', grnminsize: '3000', grnfilterredir: 'nonredirects', prop: 'extracts|pageimages|info|description|pageprops', exintro: '1', explaintext: '1', exsentences: '3', exlimit: 'max', piprop: 'thumbnail|original', pithumbsize: '960', inprop: 'url' });
  const candidates = random.query.pages.filter(p => p.extract && p.extract.length >= 100 && (p.thumbnail?.source || p.original?.source) && !p.missing && !Object.hasOwn(p.pageprops || {},'disambiguation') && !/^(List of|Index of|Outline of)/i.test(p.title));
  const selected = candidates.map(toArticle);
  if (!selected.length && attempt===0) return discoveryBatch(1);
  if (!selected.length) throw new Error('No discovery articles were available');
  return selected;
}
const discovery = new DiscoveryBuffer(()=>discoveryBatch());
export async function feed(offset: number, exclude: number[] = []) {
  const result = await discovery.take(exclude);
  return { ...result, next: offset + result.articles.length };
}
