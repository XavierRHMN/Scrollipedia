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
