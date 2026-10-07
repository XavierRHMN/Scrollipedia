import 'server-only';
import { load } from 'cheerio';
import { externalJson } from './http';
import { DiscoveryBuffer } from './discovery-buffer';
import type { WikiArticle, ArticleSection } from '@/types';
import {LANGUAGES,DEFAULT_LANGUAGE,articleLanguage,type Language} from './languages';
import {translate} from './messages';
const api=(language:Language)=>`https://${LANGUAGES[language].wikipediaHost}/w/api.php`;
type Page = { pageid: number; title: string; missing?: boolean; extract?: string; thumbnail?: { source: string }; original?: { source: string }; fullurl?: string; description?: string; pageprops?: { wikibase_item?: string }; links?: { title: string; ns: number }[] };
export async function wikiQuery<T>(params: Record<string, string>,language:Language=DEFAULT_LANGUAGE): Promise<T> {
  const cache = params.generator === 'random' ? { cache: 'no-store' as const } : { next: { revalidate: 3600 } };
  const result = await externalJson<T & { error?: { info: string } }>(`${api(language)}?${new URLSearchParams({ action: 'query', format: 'json', formatversion: '2', ...params })}`, cache);
  if (result.error) throw new Error(result.error.info);
  return result;
}
const knownArticles = new Map<string, WikiArticle>();
const titleKey = (title: string,language:Language) => `${language}:${title.replaceAll('_',' ').trim().toLocaleLowerCase(language)}`;
export function knownArticle(title: string,language:Language=DEFAULT_LANGUAGE) { return knownArticles.get(titleKey(title,language)); }
export function rememberFeedArticle(article:WikiArticle) {
  knownArticles.set(titleKey(article.title,articleLanguage(article)),article);
  if(knownArticles.size>250) knownArticles.delete(knownArticles.keys().next().value!);
}
export function toArticle(page: Page,language:Language=DEFAULT_LANGUAGE): WikiArticle {
  const article = { pageId: page.pageid, title: page.title, extract: page.extract || '', thumbnail: page.thumbnail?.source || page.original?.source, originalImage: page.original?.source, description: page.description, url: page.fullurl || `https://${LANGUAGES[language].wikipediaHost}/wiki/${encodeURIComponent(page.title.replaceAll(' ', '_'))}`, wikidataId: page.pageprops?.wikibase_item,language };
  if (article.extract) rememberFeedArticle(article);
  return article;
}
export async function articles(titles: string[],language:Language=DEFAULT_LANGUAGE): Promise<WikiArticle[]> {
  if (!titles.length) return [];
  const result = await wikiQuery<{ query: { pages: Page[] } }>({ titles: titles.slice(0, 20).join('|'), redirects: '1', prop: 'extracts|pageimages|info|pageprops|description', exintro: '1', explaintext: '1', exsentences: '4', piprop: 'thumbnail|original', pithumbsize: '960', inprop: 'url' },language);
  return result.query.pages.filter(p => !p.missing && p.pageid > 0 && p.extract).map(p=>toArticle(p,language));
}
export async function articleAndLinks(title: string,language:Language=DEFAULT_LANGUAGE) {
  const result = await wikiQuery<{ query: { pages: Page[] } }>({ titles: title, redirects: '1', prop: 'extracts|pageimages|info|pageprops|description|links', exintro: '1', explaintext: '1', exsentences: '6', piprop: 'thumbnail|original', pithumbsize: '960', inprop: 'url', plnamespace: '0', pllimit: '100' },language);
  const page = result.query.pages[0];
  if (!page || page.missing || !page.extract) throw new Error('Article not found');
  return { article: toArticle(page,language), links: (page.links || []).map(l => l.title).filter(t => !/^(List of|Index of|Outline of|Wikipedia|Help:)/.test(t)) };
}
export async function sections(title: string,language:Language=DEFAULT_LANGUAGE): Promise<ArticleSection[]> {
  const result = await externalJson<{ parse?: { text: string } }>(`${api(language)}?${new URLSearchParams({ action: 'parse', page: title, prop: 'text', format: 'json', formatversion: '2', disableeditsection: '1' })}`, { next: { revalidate: 3600 } });
  if (!result.parse) return [];
  const $ = load(result.parse.text);
  $('script,style,table,sup,.mw-editsection,.navbox,.reflist,.metadata,.hatnote,.thumb,.sidebar,figure').remove();
  const output: ArticleSection[] = [];
  let current: ArticleSection = { title: LANGUAGES[language].overview, content: '' };
  $('.mw-parser-output').first().children().each((_, element) => {
    const item = $(element);
    const heading = item.is('h2') ? item : item.find('h2').first();
    if (heading.length) { if (current.content) output.push(current); current = { title: heading.text().replace(/\[edit\]/g, '').trim(), content: '' }; }
    else if (item.is('p') && current.content.length < 3200) { const text = item.text().replace(/\[\d+\]/g, '').trim(); if (text) current.content += `${current.content ? '\n\n' : ''}${text}`; }
  });
  if (current.content) output.push(current);
  return output.filter(s => !/References|External links|Further reading|See also|Notes|Bibliography/i.test(s.title)).slice(0, 8);
}
async function discoveryBatch(language:Language,attempt=0):Promise<WikiArticle[]> {
  const random = await wikiQuery<{ query: { pages: Page[] } }>({ generator: 'random', grnnamespace: '0', grnlimit: '32', grnminsize: '3000', grnfilterredir: 'nonredirects', prop: 'extracts|pageimages|info|description|pageprops', exintro: '1', explaintext: '1', exsentences: '3', exlimit: 'max', piprop: 'thumbnail|original', pithumbsize: '960', inprop: 'url' },language);
  const candidates = random.query.pages.filter(p => p.extract && p.extract.length >= 100 && (p.thumbnail?.source || p.original?.source) && !p.missing && !Object.hasOwn(p.pageprops || {},'disambiguation') && !/^(List of|Index of|Outline of)/i.test(p.title));
  const selected = candidates.map(p=>toArticle(p,language));
  if (!selected.length && attempt===0) return discoveryBatch(language,1);
  if (!selected.length) throw new Error('No discovery articles were available');
  return selected;
}
const discoveries=new Map<Language,DiscoveryBuffer>();
export async function feed(offset: number, exclude: number[] = [],language:Language=DEFAULT_LANGUAGE) {
  let discovery=discoveries.get(language);
  if(!discovery){discovery=new DiscoveryBuffer(()=>discoveryBatch(language));discoveries.set(language,discovery);}
  const result = await discovery.take(exclude);
  return { ...result, next: offset + result.articles.length,...(result.sourceWarning ? {sourceWarning:translate(language,'Cached articles warning')} : {}) };
}
export async function matchingTitle(title:string,source:Language,target:Language){
  if(source===target)return title;
  const result=await wikiQuery<{query?:{pages:{langlinks?:{lang:string;title:string}[]}[]}}>({titles:title,redirects:'1',prop:'langlinks',lllang:target,lllimit:'1'},source);
  const match=result.query?.pages[0]?.langlinks?.find(link=>link.lang===target)?.title;
  if(!match)throw new Error(translate(target,'Article language unavailable'));
  return match;
}
export async function matchingTitles(titles:string[],source:Language,target:Language):Promise<(string|null)[]>{
  if(source===target)return titles;
  const result=await wikiQuery<{query?:{pages:{title:string;langlinks?:{lang:string;title:string}[]}[];normalized?:{from:string;to:string}[];redirects?:{from:string;to:string}[]}}>({titles:titles.join('|'),redirects:'1',prop:'langlinks',lllang:target,lllimit:'max'},source);
  const aliases=new Map([...result.query?.normalized || [],...result.query?.redirects || []].map(a=>[a.from,a.to]));
  return titles.map(title=>{
    for(let i=0;i<12 && aliases.has(title);i++)title=aliases.get(title)!;
    return result.query?.pages.find(p=>p.title===title)?.langlinks?.find(link=>link.lang===target)?.title || null;
  });
}
