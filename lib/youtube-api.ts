/**
 * YouTube API helper functions
 */

const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';

interface YouTubeVideoResponse {
    items: Array<{
        id: string;
        snippet: {
            title: string;
            publishedAt: string;
        };
    }>;
}

/**
 * Check which video IDs are available on YouTube
 * @param videoIds Array of YouTube video IDs to check (max 50)
 * @returns Array of available video IDs
 */
export async function checkVideosAvailability(
    videoIds: string[]
): Promise<string[]> {
    // Read API key at runtime, not at module load time
    const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

    if (!YOUTUBE_API_KEY) {
        throw new Error('YOUTUBE_API_KEY not found in environment variables');
    }

    if (videoIds.length === 0) {
        return [];
    }

    if (videoIds.length > 50) {
        throw new Error('Maximum 50 video IDs per request');
    }

    const url = new URL(`${YOUTUBE_API_BASE}/videos`);
    url.searchParams.set('part', 'id,snippet');
    url.searchParams.set('id', videoIds.join(','));
    url.searchParams.set('key', YOUTUBE_API_KEY);

    try {
        const response = await fetch(url.toString());

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`YouTube API error: ${response.status} - ${error}`);
        }

        const data: YouTubeVideoResponse = await response.json();

        // Return only the IDs that were found
        return data.items.map(item => item.id);
    } catch (error) {
        console.error('Error checking video availability:', error);
        throw error;
    }
}

/**
 * Check videos in batches and return unavailable IDs
 * @param allVideoIds All video IDs to check
 * @returns Object with available and unavailable IDs
 */
export async function batchCheckVideos(allVideoIds: string[]): Promise<{
    available: string[];
    unavailable: string[];
}> {
    const available: string[] = [];
    const unavailable: string[] = [];

    // Split into batches of 50
    const batches: string[][] = [];
    for (let i = 0; i < allVideoIds.length; i += 50) {
        batches.push(allVideoIds.slice(i, i + 50));
    }

    console.log(`Checking ${allVideoIds.length} videos in ${batches.length} batches...`);

    for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        console.log(`Processing batch ${i + 1}/${batches.length} (${batch.length} videos)...`);

        try {
            const availableInBatch = await checkVideosAvailability(batch);
            available.push(...availableInBatch);

            // Find unavailable ones (IDs we sent but didn't get back)
            const unavailableInBatch = batch.filter(id => !availableInBatch.includes(id));
            unavailable.push(...unavailableInBatch);

            // Small delay to be nice to the API
            if (i < batches.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        } catch (error) {
            console.error(`Error in batch ${i + 1}:`, error);
            throw error;
        }
    }

    return { available, unavailable };
}
