
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

async function analyzeVideos() {
    console.log('Analyzing video content...');

    // 1. Count items in 'סרטונים'
    const { count: videoCount, error: countError } = await supabase
        .from('content_items')
        .select('*', { count: 'exact', head: true })
        .eq('main_category', 'סרטונים');

    if (countError) console.error('Error counting videos:', countError);
    console.log(`Total items in 'סרטונים' category: ${videoCount}`);

    // 2. Count items with video_id in 'סרטונים'
    const { count: validVideoCount, error: validError } = await supabase
        .from('content_items')
        .select('*', { count: 'exact', head: true })
        .eq('main_category', 'סרטונים')
        .not('video_id', 'is', null)
        .neq('video_id', '');

    console.log(`Items in 'סרטונים' with valid video_id: ${validVideoCount}`);

    // 3. Count items with video_id in OTHER categories
    const { data: otherVideos, error: otherError } = await supabase
        .from('content_items')
        .select('main_category, count:id.count()') // Logic approximation, actually need manual group
        .not('video_id', 'is', null)
        .neq('video_id', '')
        .neq('main_category', 'סרטונים');

    if (otherError) {
        // Fallback to fetch all and count in JS if parsing fails or just count total
        const { count: otherCount } = await supabase
            .from('content_items')
            .select('*', { count: 'exact', head: true })
            .not('video_id', 'is', null)
            .neq('video_id', '')
            .neq('main_category', 'סרטונים');
        console.log(`Items with video_id NOT in 'סרטונים': ${otherCount}`);
    }

    // 4. Sample of "Missing" videos?
    // Let's check distribution of main_category for items with video_id
    const { data: distribution } = await supabase
        .from('content_items')
        .select('main_category, video_id')
        .not('video_id', 'is', null)
        .neq('video_id', '');

    if (distribution) {
        const counts: Record<string, number> = {};
        distribution.forEach(item => {
            const cat = item.main_category || 'Unknown';
            counts[cat] = (counts[cat] || 0) + 1;
        });
        console.log('Distribution of items with video_id by Category:', counts);
    }
}

analyzeVideos();
