import { test, expect } from '@playwright/test';

// Regression: clicking a topic used to change the URL but not the list, because the list
// kept its first items in client state.
for (const route of ['/articles', '/qa', '/videos']) {
  test(`${route}: choosing a topic replaces the list`, async ({ page, isMobile }) => {
    await page.goto(route);
    const items = page.locator('main a[href^="/content/"]');
    await expect(items.first()).toBeVisible({ timeout: 30_000 });
    const before = await items.evaluateAll((els) => els.map((e) => e.getAttribute('href')));

    // Desktop shows the sidebar, mobile the scrolling chip bar; pick the second topic
    // (the first button is "הכל").
    const bar = isMobile ? page.locator('div.lg\\:hidden').first() : page.locator('aside');
    const topic = bar.getByRole('button').nth(1);
    const name = (await topic.textContent())!.trim();
    await topic.click();

    await expect(page).toHaveURL(new RegExp(`topic=${encodeURIComponent(name).replace(/[()]/g, '\\$&')}`), { timeout: 30_000 });
    await expect
      .poll(async () => items.evaluateAll((els) => els.map((e) => e.getAttribute('href'))), { timeout: 30_000 })
      .not.toEqual(before);
  });
}
