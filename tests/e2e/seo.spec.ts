import { test, expect, type Page } from './fixtures';

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

test('article titles are shown without the "(מאמר)" suffix', async ({ page }) => {
  await page.goto('/articles');
  const titles = await page.locator('a[href^="/content/"] h2').allTextContents();
  expect(titles.length).toBeGreaterThan(5);
  expect(titles.filter((t) => t.includes('(מאמר)'))).toEqual([]);
  await page.locator('a[href^="/content/"]').first().click();
  await expect(page).toHaveURL(/\/content\/\d+$/, { timeout: 30_000 });
  await expect(page.getByRole('heading', { level: 1 })).not.toContainText('(מאמר)');
  await expect(page).not.toHaveTitle(/\(מאמר\)/);
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

test('topic page title and canonical (name-based URL, no query string)', async ({ page }) => {
  await page.goto('/topics');
  const chip = page.locator('section div a[href^="/topics/"]').first(); // a sub-topic chip
  const name = (await chip.textContent())?.trim();
  const href = await chip.getAttribute('href');
  await page.goto(`${href}?page=2`);
  await expect(page).toHaveTitle(`${name} - שיעורים ומאמרים | הרב שלמה אבינר`);
  const canonical = await page.locator('link[rel="canonical"]').getAttribute('href');
  expect(new URL(canonical!).pathname).toBe(href);
});

test('home and menu pages share their own image, served from this site', async ({ page, request }) => {
  const hubs: [string, string][] = [
    ['/', 'og-default.jpg'], ['/videos', 'og-videos.jpg'], ['/articles', 'og-articles.jpg'], ['/qa', 'og-qa.jpg'],
    ['/series', 'og-series.jpg'], ['/topics', 'og-topics.jpg'], ['/french', 'og-french.jpg'],
  ];
  for (const [path, file] of hubs) {
    await page.goto(path);
    const image = (await meta(page, 'property', 'og:image'))!;
    const url = (await meta(page, 'property', 'og:url'))!;
    expect(image, path).toMatch(new RegExp(`/${file.replace('.', '\\.')}$`));
    // og:url and og:image must be on a host that serves this app (not a domain still on the old wiki).
    expect(new URL(image).host, path).toBe(new URL(url).host);
    const img = await request.get(image, { maxRedirects: 0 });
    expect(img.status(), image).toBe(200);
    expect(img.headers()['content-type'], image).toContain('image/jpeg');
    expect((await request.get(url, { maxRedirects: 0 })).status(), url).toBe(200);
  }
});

test('hub pages have their own titles; /search leads to the library, canonical without the query', async ({ page }) => {
  await page.goto('/videos');
  await expect(page).toHaveTitle(/^סרטונים/);
  expect(await page.locator('link[rel="canonical"]').getAttribute('href')).toMatch(/\/videos$/);

  await page.goto('/search?q=תפילה');
  await expect(page).toHaveURL(/\/library\?q=/);
  await expect(page).toHaveTitle(/^ספריית התכנים/);
  expect(await page.locator('link[rel="canonical"]').getAttribute('href')).toMatch(/\/library$/);
});

test('sitemap.xml lists content, series, topics and hubs', async ({ request }) => {
  const res = await request.get('/sitemap.xml', { timeout: 60_000 });
  expect(res.status()).toBe(200);
  expect(res.headers()['content-type']).toContain('xml');
  const xml = await res.text();
  const urls = xml.match(/<loc>/g)?.length ?? 0;
  expect(urls).toBeGreaterThan(7000);
  expect(xml).toMatch(/<loc>[^<]*\/series\/\d+<\/loc>/);
  expect(xml).toMatch(/<loc>[^<]*\/topics\/%D7[^<]*<\/loc>/); // name-based topic URLs
  expect(xml).not.toMatch(/<loc>[^<]*\/topics\/\d+<\/loc>/);
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
