import { NextResponse, type NextRequest } from 'next/server';
import { resolveLegacy } from '@/lib/legacy';

/**
 * Redirects for URLs of the old MediaWiki site (shlomo-aviner.net), so its search
 * rankings and backlinks carry over. Only paths that no other route matches reach
 * this catch-all:
 *   /Title_With_Underscores, /index.php?title=Title, /index.php?curid=123,
 *   /w/index.php?..., /קטגוריה:Name
 * Known pages get a 301 to their new path; unknown titles a 302 to the search page.
 * The lookup is an in-memory map (lib/legacy-redirects.json), no database query.
 */
function handle(request: NextRequest) {
  const result = resolveLegacy(request.nextUrl.pathname, request.nextUrl.searchParams);
  if (result.status === 404) return new NextResponse('Not found', { status: 404 });

  const response = NextResponse.redirect(new URL(result.location, request.url), result.status);
  if (result.status === 301) response.headers.set('Cache-Control', 'public, max-age=86400');
  return response;
}

export const GET = handle;
export const HEAD = handle;
