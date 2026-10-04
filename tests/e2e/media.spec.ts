import { test, expect } from '@playwright/test';
import { seedFeed } from './fixtures';
test.beforeEach(async ({page,request}) => { await seedFeed(page,request); });

test('Wikimedia thumbnail-host images from the second feed batch load', async ({ page }) => {
  const rejected: string[] = [];
  page.on('response', response => { if (response.url().includes('/_next/image') && response.status() >= 400) rejected.push(`${response.status()} ${response.url()}`); });
  await page.goto('/scroll');
  await expect(page.locator('.topic-post').first()).toBeVisible({ timeout: 30000 });
  await page.locator('.feed-sentinel').scrollIntoViewIfNeeded();
  for (const title of ['Antikythera mechanism','Deep sea']) {
    const post = page.locator('.topic-post').filter({ has: page.getByRole('heading', { name: title, exact: true }) });
    await expect(post).toBeAttached({ timeout: 30000 });
    const image = post.locator('.post-media');
    await image.scrollIntoViewIfNeeded();
    await expect.poll(() => image.evaluate((img: HTMLImageElement) => img.naturalWidth), { timeout: 20000 }).toBeGreaterThan(0);
  }
  expect(rejected).toEqual([]);
});

test('optimization failure retries the image from its Wikimedia source', async ({ page }) => {
  await page.route('**/_next/image?*', route => route.fulfill({ status: 502, body: 'Temporary optimizer failure' }));
  await page.goto('/scroll');
  const image = page.locator('.topic-post').first().locator('.post-media');
  await expect.poll(() => image.evaluate((img: HTMLImageElement) => img.naturalWidth), { timeout: 20000 }).toBeGreaterThan(0);
  await expect(image).toHaveAttribute('src', /^https:\/\/(upload|thumb)\.wikimedia\.org\//);
});

test('thumbnail failures fall back to the original image file', async ({ page }) => {
  const original = 'https://upload.wikimedia.org/wikipedia/test/original.png';
  await page.route('**/api/wikipedia?offset=*', route => route.fulfill({ json: { articles: [{pageId:1,title:'Image fallback',extract:'An article with a picture.',url:'https://en.wikipedia.org/wiki/Test',thumbnail:'https://upload.wikimedia.org/wikipedia/test/thumbnail.png',originalImage:original}],next:1 } }));
  await page.route('**/_next/image?*', route => route.fulfill({status:502,body:'Optimizer unavailable'}));
  await page.route('https://upload.wikimedia.org/wikipedia/test/thumbnail.png', route => route.fulfill({status:429,body:'Thumbnail service busy'}));
  await page.route(original, route => route.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10" fill="blue"/></svg>'}));
  await page.goto('/scroll');
  const image = page.locator('.topic-post').first().locator('.post-media');
  await expect(image).toHaveAttribute('src', original);
  await expect.poll(() => image.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0);
});

test('source failure shows a useful state, and unconfigured narration is disabled', async ({ page, request }) => {
  await page.route('**/_next/image?*', route => route.fulfill({ status: 502, body: 'Temporary optimizer failure' }));
  await page.route(/^https:\/\/(upload|thumb)\.wikimedia\.org\//, route => route.fulfill({ status: 404, body: 'Missing image' }));
  await page.goto('/scroll');
  const post = page.locator('.topic-post').first();
  await expect(post.locator('.image-unavailable').first()).toHaveText('Image unavailable', { timeout: 20000 });
  await expect(post.locator('.post-media')).toHaveCount(0);
  const status = await (await request.get('/api/elevenlabs')).json();
  expect(typeof status.available).toBe('boolean');
  if (!status.available) await expect(post.getByRole('button', { name: 'Narration is not configured' })).toBeDisabled();
});
