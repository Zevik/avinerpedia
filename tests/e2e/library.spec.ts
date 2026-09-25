import { test, expect, type Page } from './fixtures';

// The content library (/library; /videos, /articles, /qa are presets of it): search, and
// filters by type, source, topic (and Q&A section), all kept in the URL.

const results = (page: Page) => page.locator('section[aria-label="תוצאות"] a[href^="/content/"]');
const hrefs = (page: Page) => results(page).evaluateAll((els) => els.map((e) => e.getAttribute('href')));
const activeChips = (page: Page) => page.getByLabel('סינונים פעילים');

/** The filter panel: the desktop sidebar, or the mobile bottom sheet (opened first). */
async function filterPanel(page: Page, isMobile: boolean) {
  if (!isMobile) return page.getByRole('complementary', { name: 'סינון' });
  await page.getByRole('button', { name: /^סינון/ }).click();
  return page.getByRole('dialog', { name: 'סינון' });
}

test('the library mixes content types, each card labelled with its type', async ({ page }) => {
  await page.goto('/library');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('ספריית התכנים');
  await expect(results(page).first()).toBeVisible({ timeout: 30_000 });
  const labels = await results(page).evaluateAll((els) => els.map((e) => e.querySelector('span')?.textContent?.trim()));
  expect(labels.every((l) => ['מאמר', 'וידאו', 'שו"ת', 'שו"ת בווידאו', 'שיעור בסדרה'].includes(l ?? ''))).toBe(true);
});

test('type filter: "סרטונים" leads to /videos and shows only videos', async ({ page, isMobile }) => {
  await page.goto('/library');
  const panel = await filterPanel(page, isMobile);
  await panel.getByRole('link', { name: /^סרטונים/ }).click();
  await expect(page).toHaveURL(/\/videos$/, { timeout: 30_000 });
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('סרטונים');
  const labels = await results(page).evaluateAll((els) => els.map((e) => e.querySelector('span')?.textContent?.trim()));
  expect(labels.length).toBeGreaterThan(5);
  expect(labels.every((l) => l === 'וידאו' || l === 'שו"ת בווידאו')).toBe(true);
});

test('source filter: ישיבת עטרת ירושלים, removable from the active chips', async ({ page, isMobile }) => {
  await page.goto('/library');
  const panel = await filterPanel(page, isMobile);
  await panel.getByRole('link', { name: /ישיבת עטרת ירושלים/ }).click();
  await expect(page).toHaveURL(/source=ateret/, { timeout: 30_000 });
  if (isMobile) await page.getByRole('button', { name: /^הצגת .* תוצאות$/ }).click();
  await expect(results(page).first()).toContainText('ישיבת עטרת ירושלים');
  await activeChips(page).getByRole('link', { name: /ישיבת עטרת ירושלים/ }).click();
  await expect(page).not.toHaveURL(/source=/, { timeout: 30_000 });
});

test('topic filter: choosing a core topic narrows the results', async ({ page, isMobile }) => {
  await page.goto('/library');
  await expect(results(page).first()).toBeVisible({ timeout: 30_000 });
  const before = await hrefs(page);
  const panel = await filterPanel(page, isMobile);
  const topic = panel.locator('ul a[href*="topic="]').first();
  const name = (await topic.locator('span').first().textContent())!.trim();
  await topic.click();
  await expect(page).toHaveURL(/[?&]topic=\d+/, { timeout: 30_000 });
  if (isMobile) await page.getByRole('button', { name: /^הצגת .* תוצאות$/ }).click();
  await expect(activeChips(page)).toContainText(name);
  await expect.poll(() => hrefs(page), { timeout: 30_000 }).not.toEqual(before);
});

test('all three axes combine, and the URL restores them (shareable)', async ({ page, request }) => {
  const res = await request.get('/library?type=series');
  expect(res.status()).toBe(200);
  // A topic id from the tree: the first core topic link of the sidebar (in the DOM on mobile too).
  await page.goto('/library?source=ateret');
  const topicHref = await page.locator('aside ul a[href*="topic="]').first().getAttribute('href');
  const topic = new URL(topicHref!, 'http://x').searchParams.get('topic');
  await page.goto(`/videos?source=ateret&topic=${topic}`);
  await expect(activeChips(page)).toContainText('סרטונים');
  await expect(activeChips(page)).toContainText('ישיבת עטרת ירושלים');
  await expect(results(page).first()).toBeVisible();
  const labels = await results(page).evaluateAll((els) => els.map((e) => e.textContent || ''));
  expect(labels.every((t) => t.includes('ישיבת עטרת ירושלים') && /וידאו/.test(t))).toBe(true);
});

test('search: the box searches the library; /search redirects to it', async ({ page }) => {
  await page.goto('/library');
  await page.getByRole('searchbox', { name: 'חיפוש בספרייה' }).fill('תפילה');
  await page.getByRole('searchbox', { name: 'חיפוש בספרייה' }).press('Enter');
  await expect(page).toHaveURL(/\/library\?q=/, { timeout: 30_000 });
  await expect(activeChips(page)).toContainText('"תפילה"', { timeout: 30_000 });
  await expect(results(page).first()).toBeVisible({ timeout: 30_000 });

  await page.goto('/search?q=' + encodeURIComponent('שבת'));
  await expect(page).toHaveURL(/\/library\?q=/);
});

test('searching inside the topic filter finds nested topics with their path', async ({ page, isMobile }) => {
  await page.goto('/library');
  const panel = await filterPanel(page, isMobile);
  await panel.getByPlaceholder('חיפוש נושא...').fill('חנוכה');
  const result = panel.locator('a[href*="topic="]', { hasText: 'חנוכה' }).first();
  await expect(result).toBeVisible();
  await expect(result).toContainText('חגים ומועדים');
});

test('mobile: the filter sheet stays open while choosing, "show results" closes it', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'mobile layout');
  await page.goto('/library');
  const panel = await filterPanel(page, true);
  await panel.getByRole('link', { name: /^מאמרים [\d,]+$/ }).click();
  await expect(page).toHaveURL(/\/articles$/, { timeout: 30_000 });
  const again = await filterPanel(page, true);
  await again.getByRole('link', { name: /ישיבת עטרת ירושלים|מאמרים מיוחדים/ }).first().click();
  await expect(page).toHaveURL(/source=/, { timeout: 30_000 });
  await expect(page.getByRole('dialog', { name: 'סינון' })).toBeVisible();
  await page.getByRole('button', { name: /^הצגת .* תוצאות$/ }).click();
  await expect(page.getByRole('dialog', { name: 'סינון' })).toBeHidden();
});

test('/qa: the Shulchan Aruch section filter', async ({ page, isMobile }) => {
  await page.goto('/qa');
  await expect(results(page).first()).toBeVisible({ timeout: 30_000 });
  const before = await hrefs(page);
  const panel = await filterPanel(page, isMobile);
  const section = panel.getByRole('heading', { name: 'חלק בשולחן ערוך' });
  test.skip(!(await section.count()), 'needs supabase/migrations/005_library_sa.sql');
  await panel.getByRole('link', { name: /^אורח חיים/ }).click();
  await expect(page).toHaveURL(/sa=/, { timeout: 30_000 });
  if (isMobile) await page.getByRole('button', { name: /^הצגת .* תוצאות$/ }).click();
  await expect.poll(() => hrefs(page), { timeout: 30_000 }).not.toEqual(before);
});

test('old ?topic=<name> links resolve to the curated node', async ({ page }) => {
  await page.goto(`/articles?topic=${encodeURIComponent('חנוכה')}`);
  await expect(activeChips(page)).toContainText('חנוכה', { timeout: 30_000 });
});

test('sort: "מומלץ היום" by default (a stable daily order), "הכי חדש" on request, relevance when searching', async ({ page }) => {
  await page.goto('/library');
  const sort = page.getByRole('navigation', { name: 'מיון' });
  await expect(sort.getByRole('link', { name: 'מומלץ היום' })).toHaveAttribute('aria-current', 'true');
  const first = await hrefs(page);
  await page.goto('/library'); // same day, same order (cacheable, no repeats across pages)
  expect(await hrefs(page)).toEqual(first);

  await sort.getByRole('link', { name: 'הכי חדש' }).click();
  await expect(page).toHaveURL(/sort=newest/, { timeout: 30_000 });
  await expect(page.getByRole('navigation', { name: 'מיון' }).getByRole('link', { name: 'הכי חדש' })).toHaveAttribute('aria-current', 'true');

  await page.goto('/library?q=' + encodeURIComponent('שבת'));
  await expect(page.getByText('ממוין לפי רלוונטיות')).toBeVisible();

  await page.goto('/library?type=series');
  await expect(page.getByRole('navigation', { name: 'מיון' }).getByRole('link', { name: 'לפי סדר הסדרה' })).toHaveAttribute('aria-current', 'true');
});

test('paging never repeats an item (the daily order is fixed)', async ({ page }) => {
  await page.goto('/library');
  const one = await hrefs(page);
  await page.goto('/library?page=2');
  const two = await hrefs(page);
  expect(two.length).toBeGreaterThan(0);
  expect(two.filter((h) => one.includes(h))).toEqual([]);
});

test('paging: page 2 shows other results', async ({ page }) => {
  await page.goto('/library');
  const first = await hrefs(page);
  await page.getByRole('navigation', { name: 'עמודים' }).getByRole('link', { name: 'הבא' }).click();
  await expect(page).toHaveURL(/page=2/, { timeout: 30_000 });
  await expect.poll(() => hrefs(page), { timeout: 30_000 }).not.toEqual(first);
});
