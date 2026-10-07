import { NextResponse, type NextRequest } from 'next/server';
import { resolveLegacy } from '@/lib/legacy';

/**
 * Redirects for URLs of the old MediaWiki site (shlomo-aviner.net), so its search
 * rankings and backlinks carry over. Only paths that no other route matches reach
 * this catch-all:
 *   /Title_With_Underscores, /index.php?title=Title, /index.php?curid=123,
 *   /w/index.php?..., /קטגוריה:Name
 * Known pages get a 301 to their new path; unknown titles a 302 to the search page; the
 * wiki's own pages (special pages, users, talk, edit/diff/history of unknown pages) 410 Gone.
 * The lookup is an in-memory map (lib/legacy-redirects.json), no database query.
 */
const GONE_PAGE = `<!doctype html>
<html lang="he" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex"><title>הדף הוסר | אבינרפדיה</title></head>
<body style="font-family:system-ui,sans-serif;text-align:center;padding:4rem 1rem;color:#1f2937">
<h1>הדף הזה כבר לא קיים</h1><p>זה היה דף מערכת של גרסת הוויקי הקודמת של האתר.</p>
<p><a href="/">לעמוד הבית</a> · <a href="/library">לספריית התכנים</a></p>
</body></html>`;

function handle(request: NextRequest) {
  const result = resolveLegacy(request.nextUrl.pathname, request.nextUrl.searchParams);
  if (result.status === 404) return new NextResponse('Not found', { status: 404 });
  if (result.status === 410) {
    return new NextResponse(GONE_PAGE, {
      status: 410,
      headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=86400', 'X-Robots-Tag': 'noindex' },
    });
  }

  const response = NextResponse.redirect(new URL(result.location, request.url), result.status);
  if (result.status === 301) response.headers.set('Cache-Control', 'public, max-age=86400');
  return response;
}

export const GET = handle;
export const HEAD = handle;
