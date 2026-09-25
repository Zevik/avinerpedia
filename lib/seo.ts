import type { Metadata } from 'next';
import { getVimeoId } from './video';

/**
 * Shared SEO helpers. Every page builds its metadata through `pageMetadata` because
 * Next.js replaces (does not merge) a nested `openGraph`/`twitter` object: a page that
 * sets `openGraph` without `images` would lose the default share image.
 */

/**
 * Origin for canonicals, og:url/og:image and the sitemap. On Vercel it is the project's
 * production domain (VERCEL_PROJECT_PRODUCTION_URL: the custom domain once one is attached to
 * the project, else *.vercel.app), so share previews never point at a domain that doesn't
 * serve this app yet — setting NEXT_PUBLIC_SITE_URL to shlomo-aviner.net while it still served
 * the old wiki made WhatsApp preview the old site. NEXT_PUBLIC_SITE_URL is for other hosts.
 */
const vercelProductionHost = process.env.VERCEL_PROJECT_PRODUCTION_URL;
/**
 * TEMPORARY (2026-09-25): shlomo-aviner.net is attached to the Vercel project (so it became the
 * production domain) but its DNS still points at the old wiki behind Cloudflare. Until the DNS
 * moves to Vercel, pin the origin; then set this to null (domain switch checklist, CLAUDE.md).
 */
const PINNED_SITE_URL: string | null = 'https://avinerpedia.vercel.app';
export const SITE_URL = (
  PINNED_SITE_URL ??
  (vercelProductionHost ? `https://${vercelProductionHost}` : process.env.NEXT_PUBLIC_SITE_URL || 'https://avinerpedia.vercel.app')
).replace(/\/$/, '');
export const SITE_NAME = 'אבינרפדיה';
export const DEFAULT_DESCRIPTION =
  'ארכיון שיעורי הרב שלמה אבינר שליט"א: אלפי סרטונים, מאמרים, שאלות ותשובות וסדרות לימוד, מסודרים לפי נושאים.';

/** Share images (public/, made by scripts/make-og-image.mjs): the site default and one per menu section. */
const ogImage = (file: string, alt: string) => ({ url: `/${file}`, width: 1200, height: 630, alt });
export const DEFAULT_OG_IMAGE = ogImage('og-default.jpg', 'אבינרפדיה - שיעורי הרב שלמה אבינר');
export const OG_IMAGES = {
  videos: ogImage('og-videos.jpg', 'סרטונים - שיעורי וידאו של הרב שלמה אבינר'),
  articles: ogImage('og-articles.jpg', 'מאמרים של הרב שלמה אבינר'),
  qa: ogImage('og-qa.jpg', 'שו"ת הלכה - שאלות ותשובות עם הרב שלמה אבינר'),
  series: ogImage('og-series.jpg', 'סדרות לימוד - שיעורי הרב שלמה אבינר'),
  topics: ogImage('og-topics.jpg', 'נושאים - תכני הרב שלמה אבינר לפי נושא'),
  french: ogImage('og-french.jpg', 'Cours du Rav Aviner en français'),
};

interface PageMetadataInput {
  title: string;
  description?: string;
  /** Path for the canonical URL, e.g. `/content/42` (no query string). Omit for site-wide defaults. */
  path?: string;
  image?: { url: string; width?: number; height?: number; alt?: string } | null;
  type?: 'website' | 'article';
  noindex?: boolean;
}

export function pageMetadata({ title, description = DEFAULT_DESCRIPTION, path, image, type = 'website', noindex }: PageMetadataInput): Metadata {
  const images = [image || DEFAULT_OG_IMAGE];
  return {
    title,
    description,
    ...(path ? { alternates: { canonical: path } } : {}),
    openGraph: { title, description, ...(path ? { url: path } : {}), siteName: SITE_NAME, locale: 'he_IL', type, images },
    twitter: { card: 'summary_large_image', title, description, images: images.map((i) => i.url) },
    ...(noindex ? { robots: { index: false, follow: true } } : {}),
  };
}

/** YouTube thumbnail for a plain YouTube id (not `Meir:` / `Maale:` ids), or null. */
export function youtubeThumbnail(videoId: string | null | undefined) {
  if (!videoId || !/^[A-Za-z0-9_-]{11}$/.test(videoId)) return null;
  return { url: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`, width: 480, height: 360 };
}

/** Share image for any video id: YouTube thumbnail, or the Vimeo thumbnail of a Machon Meir lesson. */
export async function videoThumbnail(videoId: string | null | undefined) {
  if (videoId?.startsWith('Meir:')) {
    const vimeoId = await getVimeoId(videoId.slice('Meir:'.length));
    return vimeoId ? { url: `https://vumbnail.com/${vimeoId}.jpg`, width: 640, height: 360 } : null;
  }
  return youtubeThumbnail(videoId);
}

/** Plain-text description (<= 160 chars) from a summary or markdown/HTML body. */
export function describe(summary: string | null | undefined, content: string | null | undefined, fallback = DEFAULT_DESCRIPTION) {
  const usableSummary = summary && !summary.includes('catid=') ? summary : '';
  const text = (usableSummary || content || '')
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/שיעור שהועבר בתאריך:.*$/gm, ' ')
    .replace(/[#*_`>|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (text.length < 20) return fallback;
  if (text.length <= 160) return text;
  const cut = text.slice(0, 157);
  return `${cut.slice(0, cut.lastIndexOf(' ') > 120 ? cut.lastIndexOf(' ') : 157)}...`;
}
