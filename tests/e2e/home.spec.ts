import { test, expect } from './fixtures';

test('the hero is compact: search and topic tiles are visible without scrolling', async ({ page }) => {
  await page.goto('/');
  const hero = await page.locator('main section').first().boundingBox();
  const viewport = page.viewportSize()!;
  expect(hero!.height).toBeLessThan(viewport.height * 0.45);
  await expect(page.getByRole('searchbox', { name: 'חיפוש בספריית התכנים' })).toBeInViewport();
  await expect(page.getByRole('navigation', { name: 'עיון מהיר' }).getByRole('link').first()).toBeInViewport();
});

test('home search goes to the library with the query', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('searchbox', { name: 'חיפוש בספריית התכנים' }).fill('תפילה');
  await page.getByRole('searchbox', { name: 'חיפוש בספריית התכנים' }).press('Enter');
  await expect(page).toHaveURL(/\/library\?q=/, { timeout: 30_000 });
});

test('topic tiles open the library filtered (and the series tile the series page)', async ({ page }) => {
  await page.goto('/');
  const tiles = page.getByRole('navigation', { name: 'עיון מהיר' });
  await expect(tiles.getByRole('link', { name: 'הלכה' })).toHaveAttribute('href', /^\/library\?topic=\d+$/);
  await expect(tiles.getByRole('link', { name: 'חגים ומועדים' })).toHaveAttribute('href', /^\/library\?topic=\d+$/);
  await expect(tiles.getByRole('link', { name: 'שו"ת סמס' })).toHaveAttribute('href', '/library?source=shut-sms');
  await expect(tiles.getByRole('link', { name: 'סדרות לימוד' })).toHaveAttribute('href', '/series');
  await tiles.getByRole('link', { name: 'הלכה' }).click();
  await expect(page).toHaveURL(/\/library\?topic=\d+/, { timeout: 30_000 });
});

test('content rows scroll sideways, each with "הציגו הכל"', async ({ page }) => {
  await page.goto('/');
  for (const title of ['פנינים מהארכיון', 'סדרות לימוד מומלצות', 'שיעורי וידאו', 'שו"תים ומאמרים אחרונים']) {
    const row = page.getByRole('region', { name: title });
    await expect(row.getByRole('link', { name: /הציגו הכל/ }), title).toBeVisible();
    const track = row.locator('div.overflow-x-auto');
    const { scrollWidth, clientWidth } = await track.evaluate((el) => ({ scrollWidth: el.scrollWidth, clientWidth: el.clientWidth }));
    expect(scrollWidth, title).toBeGreaterThan(clientWidth); // more cards than fit: it scrolls
  }
});

test('navbar: every link has the same style; the current section is marked', async ({ page, isMobile }) => {
  test.skip(isMobile, 'desktop navbar');
  await page.goto('/library');
  const nav = page.getByRole('navigation').first();
  await expect(nav.locator('a[aria-current="page"]')).toHaveText('ספריית התכנים');
  const shapes = await nav.locator('a[href^="/"]:not([aria-current])').evaluateAll((els) =>
    [...new Set(els.filter((e) => e.textContent?.trim() !== 'אבינרפדיה').map((e) => getComputedStyle(e).backgroundColor + '|' + getComputedStyle(e).borderRadius))]);
  expect(shapes).toHaveLength(1);
});

test('navbar: no "בית" item; the logo leads home', async ({ page }) => {
  await page.goto('/library');
  const nav = page.getByRole('navigation').first();
  await expect(nav.getByRole('link', { name: 'בית', exact: true })).toHaveCount(0);
  await nav.getByRole('link', { name: 'אבינרפדיה – לדף הבית' }).click();
  await expect(page).toHaveURL(/\/$/, { timeout: 30_000 });
});
