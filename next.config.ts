import type { NextConfig } from "next";
import topicRedirects from "./lib/topic-redirects.json";

/** Core topics renamed after launch: old name -> new name (first path segment of /topics URLs). */
const RENAMED_TOPICS: Record<string, string> = {
  'מועדים': 'חגים ומועדים',
};

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'img.youtube.com',
      },
      {
        protocol: 'https',
        hostname: 'vumbnail.com',
      },
    ],
  },
  // Old numeric topic pages (/topics/123, before the curated tree) -> the curated node page.
  // Done here rather than in the page: app/loading.tsx makes pages stream, so a redirect
  // from the page would be client-side with status 200 instead of a real 301.
  // Map built by scripts/source/build-legacy-redirects.ts.
  async redirects() {
    return [
      ...Object.entries(topicRedirects as Record<string, string>).map(([id, destination]) => ({
        source: `/topics/${id}`,
        destination,
        statusCode: 301 as const,
      })),
      // Renamed curated topics (scripts/source/rename-filter-node.mjs keeps their ids, so
      // ?topic=<id> links still work; only the name-based /topics URLs change).
      ...Object.entries(RENAMED_TOPICS).flatMap(([from, to]) => [
        { source: `/topics/${encodeURIComponent(from)}`, destination: `/topics/${encodeURIComponent(to)}`, statusCode: 301 as const },
        { source: `/topics/${encodeURIComponent(from)}/:rest*`, destination: `/topics/${encodeURIComponent(to)}/:rest*`, statusCode: 301 as const },
      ]),
    ];
  },
};

export default nextConfig;
