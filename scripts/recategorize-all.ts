
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
    console.log('🔄 Starting Full Re-categorization...\n');

    let allItems: any[] = [];
    let from = 0;
    const step = 1000;

    console.log('Fetching all items...');
    while (true) {
        const { data, error } = await supabase
            .from('content_items')
            .select('id, content_md, main_category_id')
            .range(from, from + step - 1);

        if (error) {
            console.error(error);
            break;
        }

        if (!data || data.length === 0) break;

        allItems = allItems.concat(data);
        from += step;
        process.stdout.write('.');
    }

    console.log(`\nFound ${allItems.length} total items.`);

    const qaPattern1 = /ש:\s+/;
    const qaPattern2 = /ת:\s+/;
    const qaPattern3 = /שאלה/;
    const qaPattern4 = /תשובה:/;

    let qaCount = 0;
    let articleCount = 0;
    let skippedCount = 0;
    let updateCount = 0;

    for (const item of allItems) {
        // Skip Series (ID 1)
        if (item.main_category_id === 1) {
            skippedCount++;
            continue;
        }

        const content = item.content_md || '';
        const hasQA12 = qaPattern1.test(content) && qaPattern2.test(content);
        const hasQA34 = qaPattern3.test(content) && qaPattern4.test(content);
        const isQA = hasQA12 || hasQA34;

        const targetId = isQA ? 2 : 3;
        const targetName = isQA ? 'שו"ת הלכה' : 'מאמרים';

        if (item.main_category_id !== targetId) {
            const { error: upError } = await supabase
                .from('content_items')
                .update({
                    main_category_id: targetId,
                    main_category: targetName
                })
                .eq('id', item.id);

            if (upError) {
                console.error(`Error updating item ${item.id}:`, upError);
            } else {
                updateCount++;
                if (isQA) qaCount++; else articleCount++;
                if (updateCount % 10 === 0) process.stdout.write('|');
            }
        }
    }

    console.log(`\n\n✨ Re-categorization complete!`);
    console.log(`Skipped (Series): ${skippedCount}`);
    console.log(`Moved to QA: ${qaCount}`);
    console.log(`Moved to Articles: ${articleCount}`);
    console.log(`Total Updates: ${updateCount}`);
}

main().catch(console.error);
