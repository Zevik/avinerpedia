import { test, expect, type Page } from '@playwright/test';

const items = (page: Page) => page.locator('main a[href^="/content/"]');
const hrefs = (page: Page) => items(page).evaluateAll((els) => els.map((e) => e.getAttribute('href')));
const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// The selected-topic heading reads "<name> (<count>)"; result cards are h2s too, so match exactly.
const selectedHeading = (page: Page, name: string) =>
  page.getByRole('heading', { level: 2, name: new RegExp(`^${escapeRe(name)} \\(\\d+\\)$`) });

/** The topic filter panel: the desktop sidebar, or the mobile drawer (opened first). */
async function filterPanel(page: Page, isMobile: boolean) {
  if (!isMobile) return page.getByRole('complementary', { name: 'סינון לפי נושא' });
  await page.getByRole('button', { name: /סינון לפי נושא/ }).click();
  return page.getByRole('dialog', { name: 'סינון לפי נושא' });
}

// Regression: choosing a topic used to change the URL but not the list.
for (const route of ['/articles', '/qa', '/videos']) {
  test(`${route}: choosing a core topic filters the list`, async ({ page, isMobile }) => {
    await page.goto(route);
    await expect(items(page).first()).toBeVisible({ timeout: 30_000 });
    const before = await hrefs(page);

    const panel = await filterPanel(page, isMobile);
    // First core topic (the first link is "הכל").
    const topic = panel.locator('ul a[href*="topic="]').first();
    const name = (await topic.locator('span').first().textContent())!.trim();
    await topic.click();

    await expect(page).toHaveURL(/[?&]topic=\d+/, { timeout: 30_000 });
    await expect(selectedHeading(page, name)).toBeVisible({ timeout: 30_000 });
    await expect.poll(() => hrefs(page), { timeout: 30_000 }).not.toEqual(before);
  });
}

test('expanding a core topic shows its sub-topics, and a sub-topic narrows the list', async ({ page, isMobile }) => {
  await page.goto('/articles');
  const panel = await filterPanel(page, isMobile);
  await panel.getByRole('button', { name: /^הרחב / }).first().click();
  const sub = panel.locator('ul ul a[href*="topic="]').first();
  await expect(sub).toBeVisible();
  const subCount = Number(await sub.locator('span').last().textContent());
  await sub.click();

  await expect(page).toHaveURL(/[?&]topic=\d+/, { timeout: 30_000 });
  // Breadcrumb shows the parent core topic above the sub-topic heading.
  await expect(page.getByRole('navigation', { name: 'נושא נבחר' }).locator('a')).toHaveCount(1, { timeout: 30_000 });
  await expect.poll(async () => (await hrefs(page)).length, { timeout: 30_000 }).toBe(Math.min(subCount, 50));
});

test('searching inside the filter finds nested topics', async ({ page, isMobile }) => {
  await page.goto('/articles');
  const panel = await filterPanel(page, isMobile);
  await panel.getByPlaceholder('חיפוש נושא...').fill('חנוכה');
  const result = panel.locator('a[href*="topic="]', { hasText: 'חנוכה' }).first();
  await expect(result).toBeVisible();
  await expect(result).toContainText('מועדים'); // shows the path
});

test('/qa: Shulchan Aruch section chips filter the list', async ({ page }) => {
  await page.goto('/qa');
  await expect(items(page).first()).toBeVisible({ timeout: 30_000 });
  const before = await hrefs(page);
  const chips = page.getByRole('navigation', { name: 'חלקי השולחן ערוך' });
  await chips.getByRole('link', { name: /אורח חיים/ }).click();
  await expect(page).toHaveURL(/sa=/, { timeout: 30_000 });
  await expect.poll(() => hrefs(page), { timeout: 30_000 }).not.toEqual(before);
});

test('old ?topic=<name> links still resolve to the curated node', async ({ page }) => {
  await page.goto(`/articles?topic=${encodeURIComponent('חנוכה')}`);
  await expect(selectedHeading(page, 'חנוכה')).toBeVisible({ timeout: 30_000 });
});
