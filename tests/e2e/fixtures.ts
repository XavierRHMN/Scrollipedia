import type { Page, APIRequestContext } from '@playwright/test';
import type { WikiArticle } from '../../types';
const titles = ['Bioluminescence','James Webb Space Telescope','Octopus','Petra','Aurora','Mycelium','Antikythera mechanism','Deep sea','Venus flytrap','Hubble Space Telescope'];
// Reproducible UI tests use real Wikipedia articles, independently of random ordering.
export async function seedFeed(page: Page, request: APIRequestContext) {
  const query = new URLSearchParams(); titles.forEach(title => query.append('titles',title));
  const response = await request.get(`/api/wikipedia?${query}`);
  if (!response.ok()) throw new Error(`Wikipedia fixtures could not load: ${response.status()}`);
  const data = await response.json() as {articles:WikiArticle[]};
  const ordered = titles.flatMap(title => data.articles.filter(a => a.title === title));
  await page.route('**/api/wikipedia?offset=*', route => {
    const offset = Number(new URL(route.request().url()).searchParams.get('offset') || 0);
    return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({articles:ordered.slice(offset,offset+5),next:offset+5})});
  });
}
