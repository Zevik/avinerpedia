import { test, expect, type Page } from '@playwright/test';

const meta = (page: Page, attr: 'name' | 'property', key: string) =>
  page.locator(`meta[${attr}="${key}"]`).first().getAttribute('content');

test('content page: title, description, canonical and YouTube share image', async ({ page }) => {
  // 104 is a YouTube video item (its video was switched to a working id by check-dead-videos).
  await page.goto('/content/104');
  await expect(page).toHaveTitle(/ - הרב שלמה אבינר \| אבינרפדיה$/);

  const description = await meta(page, 'name', 'description');
  expect(description?.length).toBeGreaterThan(20);
  expect(description!.length).toBeLessThanOrEqual(160);

  expect(await page.locator('link[rel="canonical"]').getAttribute('href')).toMatch(/\/content\/104$/);
  expect(await meta(page, 'property', 'og:image')).toBe('https://img.youtube.com/vi/G6qejC6Dx-U/hqdefault.jpg');
  expect(await meta(page, 'property', 'og:type')).toBe('article');
  expect(await meta(page, 'property', 'og:locale')).toBe('he_IL');
  expect(await meta(page, 'name', 'twitter:card')).toBe('summary_large_image');
});

test('text article uses the default share image', async ({ page }) => {
  await page.goto('/articles');
  await page.locator('a[href^="/content/"]').first().click();
  await expect(page).toHaveURL(/\/content\/\d+$/, { timeout: 30_000 });
  expect(await meta(page, 'property', 'og:image')).toMatch(/\/og-default\.jpg$/);
});

test('series page title and description', async ({ page }) => {
  await page.goto('/series');
  const card = page.locator('a[href^="/series/"]').first();
  const name = (await card.locator('h3').textContent())?.trim();
  await card.click();
  await expect(page).toHaveURL(/\/series\/\d+$/, { timeout: 30_000 });
  await expect(page).toHaveTitle(`סדרת ${name} - שיעורי הרב שלמה אבינר`);
  expect(await meta(page, 'name', 'description')).toContain(`סדרת ${name}`);
});

test('topic page title, canonical without query string', async ({ page }) => {
  await page.goto('/topics');
  const chip = page.locator('a[href*="?from="]').first();
  const name = (await chip.textContent())?.trim();
  await chip.click();
  await expect(page).toHaveURL(/\/topics\/\d+\?from=\d+$/, { timeout: 30_000 });
  await expect(page).toHaveTitle(`${name} - שיעורים ומאמרים | הרב שלמה אבינר`);
  expect(await page.locator('link[rel="canonical"]').getAttribute('href')).toMatch(/\/topics\/\d+$/);
});

test('hub pages have their own titles; search is noindex', async ({ page }) => {
  await page.goto('/videos');
  await expect(page).toHaveTitle(/^סרטונים/);
  expect(await page.locator('link[rel="canonical"]').getAttribute('href')).toMatch(/\/videos$/);

  await page.goto('/search?q=תפילה');
  expect(await meta(page, 'name', 'robots')).toContain('noindex');
});

test('sitemap.xml lists content, series, topics and hubs', async ({ request }) => {
  const res = await request.get('/sitemap.xml', { timeout: 60_000 });
  expect(res.status()).toBe(200);
  expect(res.headers()['content-type']).toContain('xml');
  const xml = await res.text();
  const urls = xml.match(/<loc>/g)?.length ?? 0;
  expect(urls).toBeGreaterThan(7000);
  expect(xml).toMatch(/<loc>[^<]*\/series\/\d+<\/loc>/);
  expect(xml).toMatch(/<loc>[^<]*\/topics\/\d+<\/loc>/);
  expect(xml).toMatch(/<loc>[^<]*\/content\/104<\/loc>/);
  expect(xml).not.toMatch(/\/content\/7838</); // hidden item
});

test('robots.txt allows crawling, blocks admin, points to the sitemap', async ({ request }) => {
  const txt = await (await request.get('/robots.txt')).text();
  expect(txt).toContain('Allow: /');
  expect(txt).toContain('Disallow: /admin');
  expect(txt).toMatch(/Sitemap: https?:\/\/\S+\/sitemap\.xml/);
});

test('default share image is served', async ({ request }) => {
  const res = await request.get('/og-default.jpg');
  expect(res.status()).toBe(200);
  expect(res.headers()['content-type']).toContain('image/jpeg');
  expect((await res.body()).length).toBeLessThan(300_000);
});
