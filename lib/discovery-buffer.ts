import type { WikiArticle } from '@/types';
function shuffled<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length-1; i > 0; i--) { const j = Math.floor(Math.random()*(i+1)); [result[i],result[j]] = [result[j],result[i]]; }
  return result;
}
export class DiscoveryBuffer {
  private unused: WikiArticle[] = [];
  private history = new Map<number,{article: WikiArticle; at: number}>();
  private pending: Promise<void> | null = null;
  constructor(private fetchBatch: () => Promise<WikiArticle[]>, private now = Date.now) {}
  async take(exclude: number[] = []) {
    const seen = new Set(exclude);
    for (const [id,entry] of this.history) if (this.now()-entry.at > 3600000) this.history.delete(id);
    this.unused = this.unused.filter(a => this.history.has(a.pageId));
    let sourceWarning: string | undefined;
    if (this.unused.filter(a => !seen.has(a.pageId)).length < 6) {
      try {
        if (!this.pending) this.pending = this.fetchBatch().then(batch => {
          for (const article of batch) {
            this.history.set(article.pageId,{article,at:this.now()});
            if (!this.unused.some(a => a.pageId === article.pageId)) this.unused.push(article);
          }
          while (this.history.size > 200) this.history.delete(this.history.keys().next().value!);
        }).finally(() => { this.pending = null; });
        await this.pending;
      } catch (error) {
        const cached = shuffled([...this.history.values()].map(entry => entry.article).filter(a => !seen.has(a.pageId))).slice(0,6);
        if (!cached.length) throw error;
        return { articles: cached, sourceWarning: 'Wikipedia is busy. Showing recently fetched articles while it recovers.' };
      }
    }
    const selected = this.unused.filter(a => !seen.has(a.pageId)).slice(0,6);
    if (!selected.length) throw new Error('No discovery articles were available');
    const ids = new Set(selected.map(a => a.pageId));
    this.unused = this.unused.filter(a => !ids.has(a.pageId));
    return { articles: selected, sourceWarning };
  }
}
