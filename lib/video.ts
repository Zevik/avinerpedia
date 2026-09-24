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
 * Gets a thumbnail URL for a given video provider and ID.
 */
export async function getVideoThumbnail(videoId: string): Promise<string | null> {
    if (!videoId) return null;

    if (videoId.includes('Meir:')) {
        const meirId = videoId.replace('Meir:', '').split('&')[0];
        const vimeoId = await getVimeoId(meirId);
        if (vimeoId) {
            return `https://vumbnail.com/${vimeoId}.jpg`;
        }
        return null;
    }

    if (videoId.includes('Maale:')) {
        // Maale doesn't have a predictable thumbnail URL easily accessible
        return null;
    }

    // Assume YouTube if no prefix
    return `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
}
