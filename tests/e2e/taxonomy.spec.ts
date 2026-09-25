import { test, expect, type Page } from './fixtures';

// Uncaught errors and non-image request failures (see smoke.spec.ts).
function trackErrors(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));
  page.on('console', (msg) => {
    if (msg.type() === 'error' && !msg.text().startsWith('Failed to load resource') && !msg.text().startsWith('Permissions policy violation') /* YouTube embeds */) errors.push(`console: ${msg.text()}`);
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

test('topics index -> core topic -> sub-topic, with name-based URLs and breadcrumb', async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto('/topics');
  const core = page.locator('section h2').first();
  const coreName = (await core.textContent())!.trim();
  await core.click();
  await expect(page).toHaveURL(new RegExp(`/topics/${encodeURIComponent(coreName)}$`), { timeout: 30_000 });
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(coreName);

  // Drill into the first sub-topic: /topics/<core>/<sub>, breadcrumb back to the core.
  const sub = page.getByRole('heading', { name: 'תתי-נושאים' }).locator('..').locator('a').first();
  const subName = (await sub.locator('span').first().textContent())!.trim();
  await sub.click();
  await expect(page).toHaveURL(new RegExp(`/topics/${encodeURIComponent(coreName)}/${encodeURIComponent(subName)}$`), { timeout: 30_000 });
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(subName);
  await expect(page.getByRole('navigation', { name: 'פירורי לחם' })).toContainText(coreName);
  expect(errors).toEqual([]);
});

test('item on a topic page links back into that topic', async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto('/topics');
  await page.locator('section div a[href^="/topics/"]').first().click(); // a sub-topic chip
  await expect(page).toHaveURL(/\/topics\/[^/]+\/[^/]+$/, { timeout: 30_000 });
  const topicPath = new URL(page.url()).pathname;

  await page.locator('a[href^="/content/"]').first().click();
  await expect(page).toHaveURL(/\/content\/\d+$/, { timeout: 30_000 });
  // The item is filed under this topic or one of its sub-topics.
  const chip = page.locator(`a[href^="${topicPath}"]`).first();
  await expect(chip).toBeVisible();
  await chip.click();
  await expect(page).toHaveURL(new RegExp(`^[^?]*${topicPath}`), { timeout: 30_000 });
  expect(errors).toEqual([]);
});

test('old numeric topic URLs redirect permanently to the curated node', async ({ request }) => {
  const res = await request.get('/topics/5', { maxRedirects: 0 });
  expect(res.status()).toBe(301);
  expect(decodeURIComponent(res.headers()['location'])).toMatch(/\/topics\/הלכה$/);
});

test('שמירת הלשון is a topic under both מוסר ומידות and הלכה › בין אדם לחברו', async ({ page }) => {
  for (const path of ['/topics/מוסר ומידות/שמירת הלשון', '/topics/הלכה/בין אדם לחברו/שמירת הלשון']) {
    await page.goto(path.split('/').map(encodeURIComponent).join('/'));
    await expect(page.getByRole('heading', { level: 1 }), path).toHaveText('שמירת הלשון');
    await expect(page.locator('a[href^="/content/"]').first(), path).toBeVisible();
  }
});

test('unknown topic path shows the not-found page', async ({ page }) => {
  await page.goto('/topics/' + encodeURIComponent('אין נושא כזה'));
  await expect(page.locator('meta[name="robots"][content*="noindex"]').first()).toBeAttached();
});
