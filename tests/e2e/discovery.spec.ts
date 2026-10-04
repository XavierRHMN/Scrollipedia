import { test, expect } from '@playwright/test';
test('rate limits show a cooldown before retrying the feed', async ({page}) => {
  await page.route('**/api/wikipedia?offset=*', route => route.fulfill({status:429,contentType:'application/json',headers:{'Retry-After':'2'},body:JSON.stringify({error:'Wikipedia is temporarily limiting requests. Try again in 2 seconds.',retryAfter:2})}));
  await page.goto('/scroll');
  const retry = page.getByRole('button',{name:/Try again/});
  await expect(retry).toBeDisabled();
  await expect(page.locator('.feed-error')).toContainText('temporarily limiting');
  await expect(retry).toBeEnabled({timeout:5000});
});
test('reloading the real feed yields a fresh selection', async ({page}) => {
  await page.goto('/scroll');
  await expect(page.locator('.topic-post').first()).toBeVisible({timeout:30000});
  const before = await page.locator('.topic-post h2').allTextContents();
  await page.reload();
  await expect(page.locator('.topic-post').first()).toBeVisible({timeout:30000});
  const after = await page.locator('.topic-post h2').allTextContents();
  expect(after).not.toEqual(before);
});
test('Acceleration → Physical quantity opens the real article', async ({page}) => {
  await page.goto('/explore/Acceleration');
  await expect(page.locator('.center-node strong')).toHaveText('Acceleration',{timeout:30000});
  const connected = page.locator('.related-accessible button').filter({hasText:/^Physical quantity$/i});
  await expect(connected).toBeVisible({timeout:30000});
  await connected.click();
  await expect(page.locator('.center-node strong')).toHaveText('Physical quantity',{timeout:30000});
  await expect(page.getByRole('tabpanel')).toContainText(/physical quantity/i);
  await expect(page.locator('.related-accessible button').first()).toBeVisible({timeout:30000});
});
test('a failed graph request preserves the known article and retry recovers', async ({page}) => {
  await page.goto('/explore/Acceleration');
  const connected = page.locator('.related-accessible button').filter({hasText:/^Physical quantity$/i});
  await expect(connected).toBeVisible({timeout:30000});
  let fail = true;
  await page.route('**/api/wikipedia?title=Physical%20quantity', route => fail ? route.fulfill({status:503,contentType:'application/json',body:'{"error":"Wikipedia is busy"}'}) : route.continue());
  await connected.click();
  await expect(page.locator('.center-node strong')).toHaveText('Physical quantity');
  await expect(page.getByRole('tabpanel')).toContainText(/physical quantity/i);
  await expect(page.locator('.topic-notice')).toContainText('retry');
  fail = false;
  await page.getByRole('button',{name:'Retry connections'}).click();
  await expect(page.locator('.topic-notice')).toHaveCount(0,{timeout:30000});
  await expect(page.locator('.related-accessible button').first()).toBeVisible({timeout:30000});
});
