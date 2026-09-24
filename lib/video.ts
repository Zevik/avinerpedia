/**
 * Utility for handling video embeds and thumbnails
 */

import meirVimeo from './meir-vimeo.json';

const vimeoByMeirId = meirVimeo as Record<string, string | null>;

/**
 * Vimeo id of a Machon Meir lesson, from lib/meir-vimeo.json (built offline by
 * scripts/build-meir-vimeo-map.mjs). meirtv.com is not scraped at request time: that
 * fails from Vercel's servers. null = no known video; callers link to the lesson instead.
 */
export async function getVimeoId(meirId: string): Promise<string | null> {
    return vimeoByMeirId[meirId.split('&')[0]] ?? null;
}

/** The lesson's page on meirtv.com, for "watch on Machon Meir" links. */
export function meirLessonUrl(meirId: string): string {
    return `https://meirtv.com/shiurim/shiur-${meirId.split('&')[0]}/`;
}

/**
 * Thumbnail for list cards (sync, client-safe): YouTube, or the Vimeo thumbnail of a
 * Machon Meir lesson. null for Maale and Meir lessons without a known Vimeo video.
 */
export function cardThumbnail(videoId: string | null | undefined): string | null {
    if (!videoId) return null;
    if (videoId.startsWith('Meir:')) {
        const vimeoId = vimeoByMeirId[videoId.slice('Meir:'.length).split('&')[0]];
        return vimeoId ? `https://vumbnail.com/${vimeoId}.jpg` : null;
    }
    if (videoId.includes('Maale:')) return null;
    return `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
}

/**
 * Gets a thumbnail URL for a given video provider and ID.
 */
export async function getVideoThumbnail(videoId: string): Promise<string | null> {
    return cardThumbnail(videoId);
}
