import type { NextConfig } from "next";
import topicRedirects from "./lib/topic-redirects.json";

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
      // Search lives in the content library (the query string is carried over).
      { source: '/search', destination: '/library', permanent: false },
    ];
  },
};

export default nextConfig;
