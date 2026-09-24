/**
 * Caching of the public site. Content changes every few days, so pages and DB reads are
 * cached for a day and purged on demand when an admin saves (see app/api/revalidate).
 * Page files export `revalidate = 86400` literally: Next needs a static value there.
 */
export const CONTENT_CACHE_SECONDS = 86400;
export const CONTENT_CACHE_TAG = 'content';
