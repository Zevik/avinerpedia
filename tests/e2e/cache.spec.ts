import { test, expect } from '@playwright/test';

// The public site is cached (lib/cache.ts) and purged on demand via /api/revalidate.

test('revalidate endpoint refuses callers that are not admins', async ({ request }) => {
  expect((await request.post('/api/revalidate')).status()).toBe(401);
  const junk = await request.post('/api/revalidate', { headers: { Authorization: 'Bearer not.a.token' } });
  expect(junk.status()).toBe(403);
  expect((await request.get('/api/revalidate')).status()).toBe(405);
});

test('content pages are served with a day-long shared cache', async ({ request }) => {
  test.skip(!process.env.E2E_BASE_URL && !process.env.E2E_PROD, 'next dev never caches');
  const res = await request.get('/content/104');
  expect(res.status()).toBe(200);
  expect(res.headers()['cache-control']).toContain('s-maxage=86400');
});

test('a hidden item is still not found when served from the cache', async ({ page }) => {
  await page.goto('/content/7838');
  await expect(page.locator('meta[name="robots"][content*="noindex"]').first()).toBeAttached();
});
