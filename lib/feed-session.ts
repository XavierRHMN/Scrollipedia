import type {WikiArticle} from '@/types';
import type {Language} from './languages';

export type FeedSession={items:WikiArticle[];seen:number[];offset:number;scrollY:number;sourceWarning:string};
// Memory only: routing keeps a feed, while a document reload starts fresh.
const sessions=new Map<Language,FeedSession>();
export function readFeedSession(language:Language){return sessions.get(language);}
export function writeFeedSession(language:Language,session:FeedSession){sessions.set(language,session);}
export function clearFeedSession(language:Language){sessions.delete(language);}
export function clearFeedSessions(){sessions.clear();}
