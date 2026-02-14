/**
 * Utility for handling video embeds and thumbnails
 */

/**
 * Resolves a Machon Meir lesson ID to a Vimeo ID if possible.
 * This is done server-side to avoid CORS issues.
 */
export async function getVimeoId(meirId: string): Promise<string | null> {
    try {
        const response = await fetch(`https://meirtv.com/shiurim/shiur-${meirId}/`, {
            next: { revalidate: 86400 } // Cache for 24 hours
        });
        const html = await response.text();
        const match = html.match(/player\.vimeo\.com\/video\/(\d+)/);
        return match ? match[1] : null;
    } catch (error) {
        console.error('Error resolving Vimeo ID:', error);
        return null;
    }
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
