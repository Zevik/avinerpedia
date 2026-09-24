import type { Metadata } from 'next';

/**
 * Shared SEO helpers. Every page builds its metadata through `pageMetadata` because
 * Next.js replaces (does not merge) a nested `openGraph`/`twitter` object: a page that
 * sets `openGraph` without `images` would lose the default share image.
 */

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://avinerpedia.vercel.app').replace(/\/$/, '');
export const SITE_NAME = 'אבינרפדיה';
export const DEFAULT_DESCRIPTION =
  'ארכיון שיעורי הרב שלמה אבינר שליט"א: אלפי סרטונים, מאמרים, שאלות ותשובות וסדרות לימוד, מסודרים לפי נושאים.';
export const DEFAULT_OG_IMAGE = { url: '/og-default.jpg', width: 1200, height: 630, alt: 'אבינרפדיה - שיעורי הרב שלמה אבינר' };

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
