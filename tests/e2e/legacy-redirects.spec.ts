import { test, expect, type APIRequestContext } from './fixtures';
import redirects from '../../lib/legacy-redirects.json';

// Real HTTP requests against the app: status code and Location header, no redirect following.
async function hit(request: APIRequestContext, url: string) {
  const res = await request.get(url, { maxRedirects: 0, timeout: 60_000 });
  return { status: res.status(), location: res.headers()['location'] ?? '' };
}
const pathOf = (location: string) => {
  const u = new URL(location, 'http://x');
  return decodeURIComponent(u.pathname + u.search);
};
const underscored = (title: string) => '/' + encodeURIComponent(title.replace(/ /g, '_'));

// A content page title, e.g. "אדם שמצד אחד..." -> /content/104
const [contentTitle, contentPath] = Object.entries(redirects.titles).find(([, p]) => p.startsWith('/content/'))!;
const [curid, curidPath] = Object.entries(redirects.curids).find(([, p]) => p.startsWith('/content/'))!;
const [categoryTitle, categoryPath] = Object.entries(redirects.titles).find(([, p]) => p.startsWith('/topics/'))!;

test.describe('legacy MediaWiki URLs', () => {
  test('/Title_With_Underscores (percent-encoded Hebrew) -> 301 to /content/[id]', async ({ request }) => {
    const { status, location } = await hit(request, underscored(contentTitle));
    expect(status).toBe(301);
    expect(pathOf(location)).toBe(contentPath);
  });

  test('/index.php?title= and /w/index.php?title= -> 301', async ({ request }) => {
    for (const script of ['/index.php', '/w/index.php']) {
      const { status, location } = await hit(request, `${script}?title=${encodeURIComponent(contentTitle.replace(/ /g, '_'))}`);
      expect(status).toBe(301);
      expect(pathOf(location)).toBe(contentPath);
    }
  });

  test('/index.php?curid= -> 301', async ({ request }) => {
    const { status, location } = await hit(request, `/index.php?curid=${curid}`);
    expect(status).toBe(301);
    expect(pathOf(location)).toBe(curidPath);
  });

  test('old home page URLs, including /(הרב)_..., -> 301 to /', async ({ request }) => {
    for (const url of [
      '/(%D7%94%D7%A8%D7%91)_%D7%90%D7%91%D7%99%D7%A0%D7%A8%D7%A4%D7%93%D7%99%D7%94-_%D7%9B%D7%9C_%D7%A9%D7%99%D7%A2%D7%95%D7%A8%D7%99_%D7%94%D7%95%D7%95%D7%99%D7%93%D7%90%D7%95_%D7%9E%D7%90%D7%AA_%D7%94%D7%A8%D7%91_%D7%A9%D7%9C%D7%9E%D7%94_%D7%90%D7%91%D7%99%D7%A0%D7%A8',
      underscored('עמוד ראשי'),
      '/index.php',
    ]) {
      const { status, location } = await hit(request, url);
      expect(status, url).toBe(301);
      expect(pathOf(location), url).toBe('/');
    }
  });

  test('category page -> 301 to its topic page', async ({ request }) => {
    const { status, location } = await hit(request, underscored(categoryTitle));
    expect(status).toBe(301);
    // Topic URLs are name-based and stored percent-encoded; pathOf() decodes.
    expect(pathOf(location)).toBe(decodeURIComponent(categoryPath));
  });

  test('unknown title -> 404 page (no DB query) with a link to search for the decoded title', async ({ request, page }) => {
    const res = await request.get(underscored('דף שלא קיים בכלל'), { maxRedirects: 0 });
    expect(res.status()).toBe(404);
    expect(res.headers()['x-robots-tag']).toBe('noindex');
    await page.goto(underscored('דף שלא קיים בכלל'));
    const search = page.getByRole('link', { name: /חיפוש "דף שלא קיים בכלל"/ });
    await expect(search).toHaveAttribute('rel', 'nofollow');
    expect(pathOf((await search.getAttribute('href'))!)).toBe('/library?q=דף שלא קיים בכלל');
  });

  test('the search suggestion escapes HTML in the title', async ({ request }) => {
    const html = await (await request.get('/' + encodeURIComponent('<script>alert(1)</script>'))).text();
    expect(html).not.toContain('<script>alert');
    expect(html).toContain('&lt;script&gt;');
  });

  test('wiki special pages, user pages and edit/diff URLs -> 410 Gone (noindex)', async ({ request }) => {
    const t = encodeURIComponent(contentTitle.replace(/ /g, '_'));
    for (const url of [
      '/index.php?title=Special:RecentChanges&days=30',
      `/${encodeURIComponent('מיוחד:דפים_מקושרים')}/X`,
      `/${encodeURIComponent('משתמש:Admin')}`,
      `/index.php?title=${t}&action=edit`,
      `/index.php?title=${t}&diff=5&oldid=4`,
    ]) {
      const res = await request.get(url, { maxRedirects: 0 });
      expect(res.status(), url).toBe(410);
      expect(res.headers()['x-robots-tag'], url).toBe('noindex');
    }
  });

  test('history and old revisions of a known page -> 301 to it; the old sitemap -> /sitemap.xml', async ({ request }) => {
    const t = encodeURIComponent(contentTitle.replace(/ /g, '_'));
    for (const q of ['action=history', 'oldid=1234']) {
      const { status, location } = await hit(request, `/index.php?title=${t}&${q}`);
      expect(status, q).toBe(301);
      expect(pathOf(location), q).toBe(contentPath);
    }
    const { status, location } = await hit(request, '/sitemap/sitemap-index-shlomo-aviner.xml');
    expect(status).toBe(301);
    expect(pathOf(location)).toBe('/sitemap.xml');
  });

  test('the redirect target actually loads', async ({ page }) => {
    const res = await page.goto(underscored(contentTitle));
    expect(res?.status()).toBe(200);
    expect(new URL(page.url()).pathname).toBe(contentPath);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 30_000 });
  });

  test('site routes and assets are not captured by the catch-all', async ({ request }) => {
    expect((await hit(request, '/videos')).status).toBe(200);
    expect((await hit(request, '/sitemap.xml')).status).toBe(200);
    expect((await hit(request, '/og-default.jpg')).status).toBe(200);
    expect((await hit(request, '/favicon.ico')).status).toBe(404);
  });

  // Latency is covered by tests/unit/legacy.test.ts (every mapped title, <1 ms per lookup);
  // timing HTTP requests here is unreliable because the whole suite shares one dev server.
});
