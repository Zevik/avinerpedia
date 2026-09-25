import { test, expect } from './fixtures';

// Signed-out visitors: every admin page redirects to the login page (middleware.ts).
for (const route of ['/admin/dashboard', '/admin/content', '/admin/categories']) {
  test(`${route} redirects to login when signed out`, async ({ page }) => {
    await page.goto(route);
    await expect(page).toHaveURL(/\/admin\/login$/);
  });
}

test('login page offers sign-in only (no public sign-up)', async ({ page }) => {
  await page.goto('/admin/login');
  await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible();
  await expect(page.getByRole('button', { name: /create|sign up|הרשמה/i })).toHaveCount(0);
});

test('the removed categories API is gone (not captured by the legacy redirects)', async ({ request }) => {
  const res = await request.get('/api/admin/categories', { maxRedirects: 0 });
  expect(res.status()).toBe(404);
});
