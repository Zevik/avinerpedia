import { test, expect, type Page } from '@playwright/test';

// Collects uncaught page errors, console errors and failed requests so a test can assert
// there were none. Broken images are ignored: many YouTube thumbnails 404 because the
// video was removed, which is a data issue rather than a site bug.
function trackErrors(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));
  page.on('console', (msg) => {
    if (msg.type() === 'error' && !msg.text().startsWith('Failed to load resource')) {
      errors.push(`console: ${msg.text()}`);
    }
  });
  page.on('response', (res) => {
    if (res.status() >= 400 && res.request().resourceType() !== 'image') {
      errors.push(`http ${res.status()}: ${res.url()}`);
    }
  });
  return errors;
}

// The Next.js error boundary (app/error.tsx) renders instead of the page on a server crash.
async function expectNoErrorBoundary(page: Page) {
  await expect(page.getByText('Application error')).toHaveCount(0);
  await expect(page.getByText('An error occurred in the Server Components render')).toHaveCount(0);
}

const routes = ['/', '/videos', '/articles', '/qa', '/series', '/topics', '/search?q=תפילה', '/french'];

for (const route of routes) {
  test(`${route} renders without errors`, async ({ page }) => {
    const errors = trackErrors(page);
    const res = await page.goto(route);
    expect(res?.status()).toBe(200);
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await expectNoErrorBoundary(page);
    expect(errors).toEqual([]);
  });
}

test('home page links open a content page', async ({ page }) => {
  await page.goto('/', { waitUntil: 'networkidle' });
  const link = page.locator('a[href^="/content/"]').first();
  test.skip((await link.count()) === 0, 'No content in the database yet');

  const errors = trackErrors(page);
  await link.click();
  await expect(page).toHaveURL(/\/content\/\d+/, { timeout: 30_000 });
  // The first /content visit compiles the route in dev, so allow more than the default 5s.
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 30_000 });
  await expectNoErrorBoundary(page);
  expect(errors).toEqual([]);
});

// 7847 is a Machon Meir lesson: only the bare Vimeo player is embedded, never the meirtv.com
// page itself (which brings its own cookie banner, ads and chat widget).
test('Machon Meir lesson embeds only the Vimeo player', async ({ page }) => {
  await page.goto('/content/7847');
  await expect(page.locator('iframe[src="https://player.vimeo.com/video/232304444"]')).toHaveCount(1);
  await expect(page.locator('iframe[src*="meirtv.com"]')).toHaveCount(0);
  expect(await page.locator('meta[property="og:image"]').first().getAttribute('content')).toBe('https://vumbnail.com/232304444.jpg');
});

// 7838 was hidden by scripts/check-dead-videos.mjs (its only content was a removed YouTube video).
test('hidden (inactive) item shows the not-found page', async ({ page }) => {
  await page.goto('/content/7838');
  await expect(page.locator('meta[name="robots"][content*="noindex"]').first()).toBeAttached();
  await expect(page.locator('iframe[src*="I1LDD3PY9U0"]')).toHaveCount(0);
});

test('unknown content id shows the not-found page', async ({ page }) => {
  await page.goto('/content/999999999');
  await expect(page.locator('meta[name="robots"][content*="noindex"]').first()).toBeAttached();
});
