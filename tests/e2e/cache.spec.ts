import { test, expect } from '@playwright/test';

// The public site is cached (lib/cache.ts) and purged on demand via /api/revalidate.

test('revalidate endpoint refuses callers that are not admins', async ({ request }) => {
  expect((await request.post('/api/revalidate')).status()).toBe(401);
  const junk = await request.post('/api/revalidate', { headers: { Authorization: 'Bearer not.a.token' } });
  expect(junk.status()).toBe(403);
  expect((await request.get('/api/revalidate')).status()).toBe(405);
});

test('content pages are served from the cache', async ({ request }) => {
  test.skip(!process.env.E2E_BASE_URL && !process.env.E2E_PROD, 'next dev never caches');
  await request.get('/content/104'); // warm
  const res = await request.get('/content/104');
  expect(res.status()).toBe(200);
  const h = res.headers();
  if (h['x-vercel-cache']) {
    // Vercel keeps s-maxage for its CDN and sends browsers max-age=0.
    expect(['HIT', 'STALE', 'PRERENDER', 'REVALIDATED']).toContain(h['x-vercel-cache']);
  } else {
    expect(h['cache-control']).toContain('s-maxage=86400');
    expect(h['x-nextjs-cache']).toBe('HIT');
  }
});

test('a hidden item is still not found when served from the cache', async ({ page }) => {
  await page.goto('/content/7838');
  await expect(page.locator('meta[name="robots"][content*="noindex"]').first()).toBeAttached();
});
