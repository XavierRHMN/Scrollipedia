import 'server-only';
import { externalJson } from './http';
import {DEFAULT_LANGUAGE,LANGUAGES,type Language} from './languages';
const RELATIONS: Record<string, string> = { P31: 'Instance of', P279: 'Part of a broader concept', P361: 'Part of', P1269: 'Connected field', P101: 'Field of work', P106: 'Occupation', P17: 'Country', P131: 'Located in', P138: 'Named after', P921: 'Main subject', P527: 'Has part' };
type Entity = { claims?: Record<string, { mainsnak: { datavalue?: { value: { id?: string } } } }[]>; sitelinks?: Record<string,{title:string}> };
export async function wikidataRelated(id?: string,language:Language=DEFAULT_LANGUAGE): Promise<{ title: string; reason: string }[]> {
  if (!id || !/^Q\d+$/.test(id)) return [];
  const entity = await externalJson<{ entities: Record<string, Entity> }>(`https://www.wikidata.org/w/api.php?${new URLSearchParams({ action: 'wbgetentities', ids: id, props: 'claims', format: 'json' })}`, { next: { revalidate: 86400 } });
  const related = Object.entries(RELATIONS).flatMap(([property, reason]) => (entity.entities[id]?.claims?.[property] || []).slice(0, 3).map(c => ({ id: c.mainsnak.datavalue?.value?.id, reason }))).filter((r): r is { id: string; reason: string } => !!r.id).slice(0, 12);
  if (!related.length) return [];
  const site=LANGUAGES[language].wikidataSite;
  const result = await externalJson<{ entities: Record<string, Entity> }>(`https://www.wikidata.org/w/api.php?${new URLSearchParams({ action: 'wbgetentities', ids: related.map(r => r.id).join('|'), props: 'sitelinks', sitefilter: site, format: 'json' })}`, { next: { revalidate: 86400 } });
  return related.flatMap(r => { const title = result.entities[r.id]?.sitelinks?.[site]?.title; return title ? [{ title, reason: r.reason }] : []; });
}
