import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const envPath = path.join(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');

const env: Record<string, string> = {};
envContent.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
        env[key.trim()] = valueParts.join('=').trim();
    }
});

const supabase = createClient(env['NEXT_PUBLIC_SUPABASE_URL'], env['SUPABASE_SERVICE_ROLE_KEY']);

async function fixMissingVideos() {
    console.log('🚀 Scanning for missing video IDs...');

    let processedCount = 0;
    let fixCount = 0;
    const BATCH_SIZE = 100;
    let hasMore = true;
    let lastId = 0;

    while (hasMore) {
        // Fetch items that might be videos but have no video_id
        // Processing in batches using ID pagination for better performance
        const { data: items, error } = await supabase
            .from('content_items')
            .select('id, title, content_md')
            .is('video_id', null)
            .gt('id', lastId)
            .order('id', { ascending: true })
            .limit(BATCH_SIZE);

        if (error) {
            console.error('Error fetching items:', error);
            break;
        }

        if (!items || items.length === 0) {
            hasMore = false;
            break;
        }

        processedCount += items.length;
        lastId = items[items.length - 1].id;
        console.log(`📦 Processing batch... (Last ID: ${lastId})`);

        for (const item of items) {
            if (!item.content_md) continue;

            // Check for Machon Meir tags with various formats
            const meirMatch = item.content_md.match(/<machonMeeir(?:FR|IL|EN)?>(\d+)<\/machonMeeir(?:FR|IL|EN)?>/i) ||
                item.content_md.match(/<machonMeeir(?:FR|IL|EN)?>(\d+)(?:&amp;|&)cat_id=\d+<\/machonMeeir(?:FR|IL|EN)?>/i) ||
                item.content_md.match(/<machonMeeir>(\d+)(?:&amp;|&)cat_id=\d+<\/machonMeeir>/i);

            if (meirMatch && meirMatch[1]) {
                const videoId = `Meir:${meirMatch[1]}`;
                console.log(`🔧 Fixing ${item.id}: ${item.title} -> ${videoId}`);

                const { error: updateError } = await supabase
                    .from('content_items')
                    .update({
                        video_id: videoId,
                        main_category: 'סרטונים'
                    })
                    .eq('id', item.id);

                if (updateError) {
                    console.error(`❌ Error updating ${item.id}:`, updateError.message);
                } else {
                    fixCount++;
                }
            }
        }
    }

    console.log(`\n✨ Fixed ${fixCount} items.`);
}

fixMissingVideos();
