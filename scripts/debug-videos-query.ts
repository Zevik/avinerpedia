
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugVideosQuery() {
    console.log('Debugging videos query...');

    // 1. Count ALL items with video_id (simulating has_video=true)
    const { count: totalVideos, error: countError } = await supabase
        .from('content_items')
        .select('*', { count: 'exact', head: true })
        .not('video_id', 'is', null)
        .neq('video_id', '');

    if (countError) {
        console.error('Error counting videos:', countError);
        return;
    }
    console.log(`Total items with video_id: ${totalVideos}`);

    // 2. Fetch with the limit used in page.tsx (50)
    const limit = 50;
    const { data: limitedData, error: limitError } = await supabase
        .from('content_items')
        .select('id, title, video_id, main_category')
        .not('video_id', 'is', null)
        .neq('video_id', '')
        .limit(limit);

    if (limitError) {
        console.error('Error fetching limited videos:', limitError);
        return;
    }
    console.log(`Fetched ${limitedData.length} items with limit ${limit}`);

    // 3. Fetch with a larger limit to see if we get more
    const largeLimit = 1000;
    const { data: largeData, error: largeError } = await supabase
        .from('content_items')
        .select('id')
        .not('video_id', 'is', null)
        .neq('video_id', '')
        .limit(largeLimit);

    if (largeError) {
        console.error('Error fetching large limit:', largeError);
        return;
    }
    console.log(`Fetched ${largeData.length} items with limit ${largeLimit}`);
}

debugVideosQuery();
