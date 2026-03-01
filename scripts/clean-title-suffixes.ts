
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const PATTERNS = [
    /\s*\(מאמר\)\s*$/g,
    /\s*\(שו"ת\)\s*$/g,
    /\s*\(שו''ת\)\s*$/g,
    /\s*\(וידאו\)\s*$/g,
    /\s*\(שיעור\)\s*$/g,
    /\s*\(צליל\)\s*$/g,
    /\s*\(א\)\s*$/g,
    /\s*\(צרפתית\)\s*$/g,
    /\s*\(אנגלית\)\s*$/g,
    /\s*\(English\)\s*$/g,
    /\s*\(French\)\s*$/g,
    /\s*\(Audio\)\s*$/g,
    /\s*\(Video\)\s*$/g,
    /\s*\(mp3\)\s*$/g,
];

async function main() {
    console.log('🧹 Starting Title Cleanup...\n');

    const { data: items, error } = await supabase
        .from('content_items')
        .select('id, title');

    if (error) {
        console.error('Error fetching items:', error);
        return;
    }

    console.log(`Found ${items.length} items to check.`);
    let updateCount = 0;

    for (const item of items) {
        let newTitle = item.title;
        let modified = false;

        for (const pattern of PATTERNS) {
            if (pattern.test(newTitle)) {
                newTitle = newTitle.replace(pattern, '').trim();
                modified = true;
            }
        }

        if (modified && newTitle !== item.title) {
            const { error: upError } = await supabase
                .from('content_items')
                .update({ title: newTitle })
                .eq('id', item.id);

            if (upError) {
                console.error(`Error updating item ${item.id}:`, upError);
            } else {
                updateCount++;
                if (updateCount % 10 === 0) {
                    process.stdout.write('.');
                }
            }
        }
    }

    console.log(`\n\n✨ Title cleanup complete! Updates: ${updateCount}`);
}

main().catch(console.error);
