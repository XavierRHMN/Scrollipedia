export type WikiArticle = { pageId: number; title: string; description?: string; extract: string; thumbnail?: string; originalImage?: string; url: string; wikidataId?: string; feedSummary?:string; summarySource?:'english'|'simple'|'gemini'; simpleUrl?:string };
export type ArticleSection = { title: string; content: string };
export type RelatedTopic = WikiArticle & { reason: string };
export type TopicDetail = { article: WikiArticle; sections: ArticleSection[]; related: RelatedTopic[]; organized: boolean; sourceWarning?: string };
export type ExplorationPath = { id: string; name: string; articles: WikiArticle[]; savedAt: string };
