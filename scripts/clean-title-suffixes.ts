
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const PATTERNS = [
    /\s*\((מאמר|שו"ת|שו''ת|וידאו|שיעור|צליל|א|צרפתית|אנגלית|English|French|Audio|Video|mp3)\)\s*$/
];

async function main() {
    console.log('🧹 Starting Full Title Cleanup (Paginated)...\n');

    let allItems: any[] = [];
    let from = 0;
    const step = 1000;

    while (true) {
        const { data, error } = await supabase
            .from('content_items')
            .select('id, title')
            .range(from, from + step - 1);

        if (error) {
            console.error('Error fetching items:', error);
            break;
        }

        if (!data || data.length === 0) break;

        allItems = allItems.concat(data);
        from += step;
        process.stdout.write('.');
    }

    console.log(`\n\nChecking ${allItems.length} total items.`);
    let updateCount = 0;

    for (const item of allItems) {
        const currentTitle = item.title || '';
        let newTitle = currentTitle;
        let modified = false;

        for (const pattern of PATTERNS) {
            while (pattern.test(newTitle)) {
                newTitle = newTitle.replace(pattern, '').trim();
                modified = true;
            }
        }

        if (modified && newTitle !== currentTitle) {
            const { error: upError } = await supabase
                .from('content_items')
                .update({ title: newTitle })
                .eq('id', item.id);

            if (upError) {
                if (upError.code === '23505') {
                    // Duplicate key error - The clean version already exists. Delete this suffixed one!
                    console.log(`\n🗑️ Found duplicate. Deleting suffixed version ID ${item.id} (${currentTitle}) in favor of clean version.`);
                    const { error: delError } = await supabase
                        .from('content_items')
                        .delete()
                        .eq('id', item.id);

                    if (delError) console.error(`Error deleting duplicate ${item.id}:`, delError);
                } else {
                    console.error(`\nError updating item ${item.id}:`, upError);
                }
            } else {
                updateCount++;
                if (updateCount % 10 === 0) process.stdout.write('|');
            }
        }
    }

    console.log(`\n\n✨ Title cleanup complete! Total items updated: ${updateCount}`);
}

main().catch(console.error);
