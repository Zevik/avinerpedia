
import { createClient } from '@supabase/supabase-js';
import { batchCheckVideos } from '../lib/youtube-api';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function main() {
    console.log('🎬 Deactivating Items with Unavailable YouTube Videos\n');

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const youtubeKey = process.env.YOUTUBE_API_KEY;

    if (!supabaseUrl || !supabaseKey || !youtubeKey) {
        console.error('❌ Missing credentials in .env.local (Supabase or YouTube)');
        process.exit(1);
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('📊 Fetching all active items with YouTube videos...');

    let allItems: any[] = [];
    let hasMore = true;
    let offset = 0;
    const PAGE_SIZE = 1000;

    while (hasMore) {
        const { data: pageItems, error } = await supabase
            .from('content_items')
            .select('id, title, video_id')
            .eq('is_active', true)
            .not('video_id', 'is', null)
            .not('video_id', 'like', 'Meir:%')
            .not('video_id', 'like', 'Maale:%')
            .range(offset, offset + PAGE_SIZE - 1);

        if (error) {
            console.error('❌ Error fetching items:', error);
            process.exit(1);
        }

        if (pageItems && pageItems.length > 0) {
            allItems.push(...pageItems);
            offset += PAGE_SIZE;
            if (pageItems.length < PAGE_SIZE) hasMore = false;
        } else {
            hasMore = false;
        }
    }

    if (allItems.length === 0) {
        console.log('✅ No items to check.');
        return;
    }

    console.log(`Found ${allItems.length} items to validate.`);

    // Extract unique video IDs
    const uniqueVideoIds = Array.from(new Set(allItems.map(item => item.video_id as string)));
    console.log(`Checking ${uniqueVideoIds.length} unique video IDs...\n`);

    const { available, unavailable } = await batchCheckVideos(uniqueVideoIds);

    console.log('\n📊 Validation Results:');
    console.log(`  ✅ Available: ${available.length}`);
    console.log(`  ❌ Unavailable: ${unavailable.length}`);

    if (unavailable.length === 0) {
        console.log('\n🎉 All videos are working! Nothing to deactivate.');
        return;
    }

    // Find all item IDs that use unavailable videos
    const itemsToDeactivate = allItems.filter(item => unavailable.includes(item.video_id as string));
    const idsToDeactivate = itemsToDeactivate.map(item => item.id);

    console.log(`\n⚠️  Deactivating ${itemsToDeactivate.length} items...`);

    // Update in batches of 100
    const batchSize = 100;
    for (let i = 0; i < idsToDeactivate.length; i += batchSize) {
        const batchIds = idsToDeactivate.slice(i, i + batchSize);
        console.log(`Updating batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(idsToDeactivate.length / batchSize)}...`);

        const { error: updateError } = await supabase
            .from('content_items')
            .update({ is_active: false })
            .in('id', batchIds);

        if (updateError) {
            console.error(`❌ Error updating batch:`, updateError);
        }
    }

    console.log(`\n✅ Successfully deactivated ${idsToDeactivate.length} items.`);

    // Log the deactivated items for reference
    const logPath = path.join(process.cwd(), 'deactivated-videos-log.json');
    fs.writeFileSync(logPath, JSON.stringify({
        date: new Date().toISOString(),
        deactivated_count: idsToDeactivate.length,
        items: itemsToDeactivate
    }, null, 2));

    console.log(`💾 Log saved to: ${logPath}`);
}

main().catch(console.error);
