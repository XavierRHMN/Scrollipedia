import Bottleneck from 'bottleneck';
export class SourceError extends Error {
  constructor(public status: number, public retryAfter?: number) { super(`Source returned ${status}`); }
}
export function retryDelay(header: string | null, now: number): number {
  const seconds = header === null ? NaN : /^\d+$/.test(header) ? Number(header) : Math.ceil((Date.parse(header)-now)/1000);
  return Number.isFinite(seconds) ? Math.max(1,seconds) : 5;
}
type Options = { userAgent: string; minTime: number; fetcher?: typeof fetch; now?: () => number; sleep?: (ms: number) => Promise<void>; maxRetryWait?: number };
type RequestOptions = RequestInit & { next?: { revalidate?: number | false } };
export class WikimediaClient {
  private limiter: Bottleneck;
  private cooldownUntil = 0;
  private pending = new Map<string,Promise<unknown>>();
  private cache = new Map<string,{value: unknown; expires: number}>();
  private fetcher: typeof fetch;
  private now: () => number;
  private sleep: (ms: number) => Promise<void>;
  constructor(private options: Options) {
    this.limiter = new Bottleneck({ maxConcurrent: 1, minTime: options.minTime, highWater: 24, strategy: Bottleneck.strategy.OVERFLOW });
    this.fetcher = options.fetcher || fetch;
    this.now = options.now || Date.now;
    this.sleep = options.sleep || (ms => new Promise(resolve => setTimeout(resolve,ms)));
  }
  json<T>(url: string, init: RequestOptions = {}, seconds = 12): Promise<T> {
    const cached = this.cache.get(url);
    if (init.cache !== 'no-store' && cached && cached.expires > this.now()) return Promise.resolve(cached.value as T);
    if (cached) this.cache.delete(url);
    const pending = this.pending.get(url);
    if (pending) return pending as Promise<T>;
    const task = this.run<T>(url,init,seconds).then(value => {
      const ttl = init.cache !== 'no-store' && typeof init.next?.revalidate === 'number' ? init.next.revalidate : 0;
      if (ttl > 0) {
        this.cache.set(url,{value,expires:this.now()+ttl*1000});
        if (this.cache.size > 64) this.cache.delete(this.cache.keys().next().value!);
      }
      return value;
    }).finally(() => this.pending.delete(url));
    this.pending.set(url,task);
    return task;
  }
  private async run<T>(url: string, init: RequestOptions, seconds: number): Promise<T> {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        this.checkCooldown();
        return await this.limiter.schedule(async () => {
          this.checkCooldown();
          const headers = new Headers(init.headers); headers.set('User-Agent',this.options.userAgent);
          // Cache parsed successes ourselves; never persist a 200 API error in Next's fetch cache.
          const requestOptions: RequestOptions = { ...init, cache: 'no-store', signal:AbortSignal.timeout(seconds*1000), headers };
          delete requestOptions.next;
          const response = await this.fetcher(url,requestOptions);
          if (!response.ok) {
            const delay = retryDelay(response.headers.get('retry-after'),this.now());
            await response.body?.cancel();
            if ([429,503].includes(response.status)) this.cooldownUntil = Math.max(this.cooldownUntil,this.now()+delay*1000);
            throw new SourceError(response.status,delay);
          }
          const value = await response.json();
          // Action API overload errors can arrive as HTTP 200.
          if (['maxlag','ratelimited'].includes(value.error?.code)) {
            const delay = retryDelay(response.headers.get('retry-after'),this.now());
            this.cooldownUntil = Math.max(this.cooldownUntil,this.now()+delay*1000);
            throw new SourceError(429,delay);
          }
          return value as T;
        });
      } catch (error) {
        const maxWait = this.options.maxRetryWait ?? 6;
        if (attempt === 0 && error instanceof SourceError && [429,502,503,504].includes(error.status) && error.retryAfter! <= maxWait) {
          await this.sleep(error.retryAfter!*1000 + Math.floor(Math.random()*250));
          continue;
        }
        throw error;
      }
    }
    throw new Error('Source unavailable');
  }
  private checkCooldown() {
    if (this.cooldownUntil > this.now()) throw new SourceError(429,Math.ceil((this.cooldownUntil-this.now())/1000));
  }
}
