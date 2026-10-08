import { NextResponse, type NextRequest } from 'next/server';
import { resolveLegacy } from '@/lib/legacy';

/**
 * Redirects for URLs of the old MediaWiki site (shlomo-aviner.net), so its search
 * rankings and backlinks carry over. Only paths that no other route matches reach
 * this catch-all:
 *   /Title_With_Underscores, /index.php?title=Title, /index.php?curid=123,
 *   /w/index.php?..., /קטגוריה:Name
 * Known pages get a 301 to their new path; unknown titles a light 404 page with a link to
 * search the library for the title; the wiki's own pages (special pages, users, talk,
 * edit/diff/history of unknown pages) 410 Gone. The lookup is an in-memory map
 * (lib/legacy-redirects.json): none of these responses queries the database.
 */
const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

/** A minimal standalone page (route handlers don't get the site layout). */
const page = (title: string, body: string) => `<!doctype html>
<html lang="he" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex"><title>${title} | אבינרפדיה</title>
<style>
body{font-family:system-ui,sans-serif;text-align:center;padding:4rem 1rem;color:#1f2937;background:#f8fafc;margin:0}
h1{font-size:1.75rem;margin:0 0 .75rem}p{margin:.5rem 0 1.25rem;line-height:1.6}
.btn{display:inline-block;background:#1d4ed8;color:#fff;text-decoration:none;font-weight:600;padding:.75rem 1.5rem;border-radius:999px}
.btn:hover{background:#1e40af}.links a{color:#1d4ed8}
</style></head>
<body><main>${body}</main></body></html>`;

const GONE_PAGE = page(
  'הדף הוסר',
  `<h1>הדף הזה כבר לא קיים</h1><p>זה היה דף מערכת של גרסת הוויקי הקודמת של האתר.</p>
<p class="links"><a href="/">לעמוד הבית</a> · <a href="/library">לספריית התכנים</a></p>`,
);

function notFoundPage(query: string) {
  // nofollow: the search runs a database query; it is for people, not for crawlers.
  const search = query
    ? `<p>ייתכן שהוא הועבר או ששמו השתנה.</p>
<p><a class="btn" rel="nofollow" href="/library?q=${encodeURIComponent(query)}">חיפוש &quot;${escapeHtml(query)}&quot; בספריית התכנים</a></p>`
    : '';
  return page(
    'הדף לא נמצא',
    `<h1>הדף לא נמצא</h1>${search}
<p class="links"><a href="/">לעמוד הבית</a> · <a href="/library">לספריית התכנים</a></p>`,
  );
}

const htmlHeaders = { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=86400', 'X-Robots-Tag': 'noindex' };

function handle(request: NextRequest) {
  const result = resolveLegacy(request.nextUrl.pathname, request.nextUrl.searchParams);
  if (result.status === 404) {
    // Asset-like paths and unknown /api/, /admin/ paths: a bare 404.
    if (result.query === undefined) return new NextResponse('Not found', { status: 404 });
    return new NextResponse(notFoundPage(result.query), { status: 404, headers: htmlHeaders });
  }
  if (result.status === 410) return new NextResponse(GONE_PAGE, { status: 410, headers: htmlHeaders });

  const response = NextResponse.redirect(new URL(result.location, request.url), 301);
  response.headers.set('Cache-Control', 'public, max-age=86400');
  return response;
}

export const GET = handle;
export const HEAD = handle;
