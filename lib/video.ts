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
 * A video id from what an editor pastes: a YouTube id, a YouTube URL (watch?v=, youtu.be/,
 * embed/, shorts/), or a site id ("Meir:1234", "Maale:…"). Empty -> null.
 */
export function normalizeVideoInput(input: string): string | null {
    const v = input.trim();
    if (!v) return null;
    if (/^(Meir|Maale):/i.test(v)) return v.replace(/^meir:/i, 'Meir:').replace(/^maale:/i, 'Maale:');
    const url = v.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([\w-]{11})/);
    if (url) return url[1];
    return v;
}

/** Whether a (normalized) video id looks valid: a YouTube id, or Meir:/Maale: with a value. */
export function isValidVideoId(id: string): boolean {
    return /^[\w-]{11}$/.test(id) || /^Meir:\d+/.test(id) || /^Maale:\S+/.test(id);
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
