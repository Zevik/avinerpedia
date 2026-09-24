import { test, expect, type Page } from '@playwright/test';

// Uncaught errors and non-image request failures (see smoke.spec.ts).
function trackErrors(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));
  page.on('console', (msg) => {
    if (msg.type() === 'error' && !msg.text().startsWith('Failed to load resource')) errors.push(`console: ${msg.text()}`);
  });
  page.on('response', (res) => {
    if (res.status() >= 400 && res.request().resourceType() !== 'image') errors.push(`http ${res.status()}: ${res.url()}`);
  });
  return errors;
}

test('series list -> series page lists episodes in order', async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto('/series');
  const first = page.locator('a[href^="/series/"]').first();
  const name = (await first.locator('h3').textContent())?.trim();
  await first.click();
  await expect(page).toHaveURL(/\/series\/\d+$/, { timeout: 30_000 });
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(name!);

  const numbers = await page.locator('ol li span.rounded-full').allTextContents();
  expect(numbers.length).toBeGreaterThan(1);
  const asInts = numbers.map(Number);
  expect(asInts).toEqual([...asInts].sort((a, b) => a - b));
  expect(errors).toEqual([]);
});

test('episode page has series navigation to the next episode', async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto('/series');
  await page.locator('a[href^="/series/"]').first().click();
  await expect(page).toHaveURL(/\/series\/\d+$/, { timeout: 30_000 });
  const seriesUrl = page.url();

  await page.locator('ol li a').first().click();
  await expect(page).toHaveURL(/\/content\/\d+$/, { timeout: 30_000 });
  const nav = page.getByRole('navigation', { name: 'ניווט בסדרה' });
  await expect(nav).toContainText('שיעור 1');
  await expect(nav.locator(`a[href="${new URL(seriesUrl).pathname}"]`)).toBeVisible();

  const firstUrl = page.url();
  await nav.getByText('הבא:').click();
  await expect(page).not.toHaveURL(firstUrl, { timeout: 30_000 });
  await expect(page.getByRole('navigation', { name: 'ניווט בסדרה' })).toContainText('הקודם:');
  expect(errors).toEqual([]);
});

test('topics index -> topic page with breadcrumb and items', async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto('/topics');
  const branch = page.locator('h2').first();
  const rootName = (await branch.textContent())?.trim();
  await branch.click();
  await expect(page).toHaveURL(/\/topics\/\d+$/, { timeout: 30_000 });
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(rootName!);

  // Drill into the first sub-topic; the breadcrumb must lead back to the root.
  await page.getByRole('heading', { name: 'תתי-נושאים' }).locator('..').locator('a').first().click();
  // Wait for the sub-topic URL; the root's /topics/<id> would match a looser pattern immediately.
  await expect(page).toHaveURL(/\/topics\/\d+\?from=\d+$/, { timeout: 30_000 });
  await expect(page.getByRole('navigation', { name: 'פירורי לחם' })).toContainText(rootName!);
  expect(errors).toEqual([]);
});

test('item on a topic page links back to that topic', async ({ page }) => {
  const errors = trackErrors(page);
  // Start from a topic with direct items, so the opened item is guaranteed to be tagged with it.
  await page.goto('/topics');
  await page.locator('section a[href^="/topics/"]').first().click();
  await expect(page).toHaveURL(/\/topics\/\d+$/, { timeout: 30_000 });
  const topicPath = new URL(page.url()).pathname;
  const topicName = (await page.getByRole('heading', { level: 1 }).textContent())?.trim();

  await page.locator('a[href^="/content/"]').first().click();
  await expect(page).toHaveURL(/\/content\/\d+$/, { timeout: 30_000 });
  const chip = page.locator(`a[href="${topicPath}"]`);
  await expect(chip).toHaveText(topicName!);
  await chip.click();
  await expect(page).toHaveURL(new RegExp(`${topicPath}$`), { timeout: 30_000 });
  expect(errors).toEqual([]);
});
