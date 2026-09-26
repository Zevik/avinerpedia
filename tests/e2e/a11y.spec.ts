import AxeBuilder from '@axe-core/playwright';
import { test, expect, type Page } from './fixtures';

// Automated accessibility scan (axe-core, WCAG 2.0/2.1 A + AA rules — the basis of ת"י 5568).
// It catches what a machine can: contrast, names/labels, ARIA, landmarks, headings. Keyboard
// behaviour (skip link, the filter dialog) is tested below; a manual screen-reader pass is
// still needed for a full audit (see /accessibility).
const pages = [
  '/',
  '/library',
  '/library?q=תפילה',
  '/videos',
  '/qa',
  '/series',
  '/topics',
  `/topics/${encodeURIComponent('מוסר ומידות')}`,
  '/content/104',
  '/content/7838',
  '/about',
  '/rav-aviner',
  '/accessibility',
  '/privacy',
  '/content/999999999', // not found
];

async function scan(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    // Third-party players are outside our control; their frames are scanned by their makers.
    .exclude('iframe')
    .analyze();
  return results.violations.map((v) => `${v.id} (${v.impact}): ${v.help} — ${v.nodes.slice(0, 3).map((n) => n.target.join(' ')).join(' | ')}`);
}

for (const route of pages) {
  test(`a11y: ${route}`, async ({ page }) => {
    await page.goto(route);
    expect(await scan(page)).toEqual([]);
  });
}

test('skip link moves focus to the main content', async ({ page, isMobile }) => {
  test.skip(isMobile, 'keyboard navigation');
  await page.goto('/library');
  await page.keyboard.press('Tab');
  const skip = page.getByRole('link', { name: 'דילוג לתוכן הראשי' });
  await expect(skip).toBeFocused();
  await expect(skip).toBeVisible();
  await page.keyboard.press('Enter');
  await expect(page.locator('#main-content')).toBeFocused();
});

test('mobile filter dialog: focus moves in, is trapped, Escape closes and returns focus', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'the bottom sheet is the mobile layout');
  await page.goto('/library');
  const opener = page.getByRole('button', { name: /^סינון/ });
  await opener.click();
  const dialog = page.getByRole('dialog', { name: 'סינון' });
  await expect(dialog).toBeVisible();
  await expect.poll(() => dialog.evaluate((d) => d.contains(document.activeElement))).toBe(true);
  // Shift+Tab from the first element wraps inside the dialog.
  await page.keyboard.press('Shift+Tab');
  await expect.poll(() => dialog.evaluate((d) => d.contains(document.activeElement))).toBe(true);
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(opener).toBeFocused();
});

test('footer and navbar link to about, accessibility and privacy', async ({ page }) => {
  await page.goto('/');
  const footer = page.locator('footer');
  await expect(footer.getByRole('link', { name: 'אודות' })).toHaveAttribute('href', '/about');
  await expect(footer.getByRole('link', { name: 'על הרב אבינר' })).toHaveAttribute('href', '/rav-aviner');
  await expect(footer.getByRole('link', { name: 'הצהרת נגישות' })).toHaveAttribute('href', '/accessibility');
  // The accessibility icon sits in the navbar like the search icon (no floating widget).
  await expect(page.locator('nav[aria-label="ראשי"]').getByRole('link', { name: 'נגישות' })).toHaveAttribute('href', '/accessibility');
  await expect(footer.getByRole('link', { name: 'מדיניות פרטיות' })).toHaveAttribute('href', '/privacy');
});
