import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/seo';

/**
 * The library's searched/filtered/sorted/paged views (any query string on /library, /videos,
 * /articles, /qa and the topic pages) are blocked: every library page links to ~200 filter
 * combinations, and bots crawling them sent tens of thousands of uncached queries to the
 * database (statement timeouts). They are also noindex (lib/seo.ts), as a backstop for links
 * from elsewhere. The plain hubs, topic pages and content pages stay crawlable.
 */
const FILTERED_VIEW_DISALLOWS = ['/library?', '/videos?', '/articles?', '/qa?', '/topics/*?'];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin', '/api/', ...FILTERED_VIEW_DISALLOWS],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
