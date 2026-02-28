
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function deactivateEmptyItems() {
    console.log('Starting deactivation of empty items...');

    // Note: We assume the column exists. If not, the update will fail.
    // The user needs to run the SQL first.

    const { data: items, error: fetchError } = await supabase
        .from('content_items')
        .select('id, title, content_md, video_id')
        .or('content_md.is.null,content_md.eq."",video_id.is.null,video_id.eq.""');

    if (fetchError) {
        console.error('Error fetching items:', fetchError);
        return;
    }

    // Filter in memory for items that have NEITHER content nor video
    const emptyItems = items.filter(item =>
        (!item.content_md || item.content_md.trim() === '') &&
        (!item.video_id || item.video_id.trim() === '')
    );

    console.log(`Found ${emptyItems.length} empty items.`);

    if (emptyItems.length === 0) return;

    const ids = emptyItems.map(item => item.id);

    // Update in batches
    const batchSize = 100;
    for (let i = 0; i < ids.length; i += batchSize) {
        const batch = ids.slice(i, i + batchSize);
        const { error: updateError } = await supabase
            .from('content_items')
            .update({ is_active: false })
            .in('id', batch);

        if (updateError) {
            console.error(`Error updating batch starting at index ${i}:`, updateError);
        } else {
            console.log(`Deactivated batch ${i / batchSize + 1}/${Math.ceil(ids.length / batchSize)}`);
        }
    }

    console.log('Done!');
}

deactivateEmptyItems();
