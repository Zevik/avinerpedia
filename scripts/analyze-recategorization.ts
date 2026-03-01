
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
    console.log('🔍 Fetching all items for analysis...');

    let allItems: any[] = [];
    let from = 0;
    const step = 1000;

    while (true) {
        const { data, error } = await supabase
            .from('content_items')
            .select('id, title, content_md, main_category_id, main_category')
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

    let qaPatternsCount = 0;
    let articlePatternsCount = 0;
    let seriesItems = 0;
    let videoItems = 0;

    const miscategorizedQA = [];
    const miscategorizedArticles = [];

    // Hebrew patterns
    const qaPattern1 = /ש:\s+/;
    const qaPattern2 = /ת:\s+/;
    const qaPattern3 = /שאלה/;
    const qaPattern4 = /תשובה:/;

    for (const item of allItems) {
        const content = item.content_md || '';
        const hasQA12 = qaPattern1.test(content) && qaPattern2.test(content);
        const hasQA34 = qaPattern3.test(content) && qaPattern4.test(content);
        const isQA = hasQA12 || hasQA34;

        const currentCatId = item.main_category_id;

        if (currentCatId === 1) { // סדרות
            seriesItems++;
            continue;
        }

        if (isQA) {
            qaPatternsCount++;
            if (currentCatId !== 2) { // Should be שו"ת
                miscategorizedQA.push({ id: item.id, title: item.title, current: item.main_category, currentId: currentCatId });
            }
        } else {
            if (currentCatId === 4) { // סרטונים
                videoItems++;
                continue;
            }

            articlePatternsCount++;
            if (currentCatId !== 3) { // Should be מאמרים
                miscategorizedArticles.push({ id: item.id, title: item.title, current: item.main_category, currentId: currentCatId });
            }
        }
    }

    console.log(`\nResults:`);
    console.log(`Series items: ${seriesItems}`);
    console.log(`Video items: ${videoItems}`);
    console.log(`Matches QA pattern: ${qaPatternsCount}`);
    console.log(`Matches Article pattern (non-QA): ${articlePatternsCount}`);

    console.log(`\nPotential Q&A updates (need to move to ID 2): ${miscategorizedQA.length}`);
    console.log(`Potential Article updates (need to move to ID 3): ${miscategorizedArticles.length}`);

    if (miscategorizedQA.length > 0) {
        console.log('\nSample Q&A to move to ID 2:');
        console.log(JSON.stringify(miscategorizedQA.slice(0, 3), null, 2));
    }
    if (miscategorizedArticles.length > 0) {
        console.log('\nSample Articles to move to ID 3:');
        console.log(JSON.stringify(miscategorizedArticles.slice(0, 3), null, 2));
    }
}

main().catch(console.error);
