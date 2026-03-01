
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
    console.log('🧹 Starting Category Cleanup and Merging...\n');

    // 1. CLEANUP FOR "מאמרים" (Articles)
    console.log('📚 Processing Articles (מאמרים)...');
    const { data: articleCat } = await supabase.from('categories').select('id').eq('name', 'מאמרים').eq('type', 'main').single();

    if (articleCat) {
        // Delete sub-categories
        const { error: delError } = await supabase.from('categories').delete().eq('parent_id', articleCat.id).eq('type', 'sub');
        if (delError) console.error('Error deleting Article sub-categories:', delError);
        else console.log('  ✅ Deleted Article sub-categories');

        // Update content items
        const { error: upError } = await supabase.from('content_items').update({ sub_category: null, sub_category_id: null }).eq('main_category_id', articleCat.id);
        if (upError) console.error('Error clearing Article content items sub-categories:', upError);
        else console.log('  ✅ Cleared Article content items sub-categories');
    }

    // 2. CLEANUP FOR "שו\"ת הלכה" (Q&A)
    console.log('❓ Processing Q&A (שו"ת הלכה)...');
    const { data: qaCat } = await supabase.from('categories').select('id').eq('name', 'שו"ת הלכה').eq('type', 'main').single();

    if (qaCat) {
        // Delete sub-categories
        const { error: delError } = await supabase.from('categories').delete().eq('parent_id', qaCat.id).eq('type', 'sub');
        if (delError) console.error('Error deleting Q&A sub-categories:', delError);
        else console.log('  ✅ Deleted Q&A sub-categories');

        // Update content items
        const { error: upError } = await supabase.from('content_items').update({ sub_category: null, sub_category_id: null }).eq('main_category_id', qaCat.id);
        if (upError) console.error('Error clearing Q&A content items sub-categories:', upError);
        else console.log('  ✅ Cleared Q&A content items sub-categories');
    }

    // 3. MERGE FOR "סרטונים" (Videos)
    console.log('🎥 Processing Video Topics (סרטונים - אקטואליה)...');
    const videoMainId = 4; // As seen in our check
    const targetSubId = 25; // "אקטואליה"

    // Update content items containing "אקטואליה" in sub_category
    const { error: upError } = await supabase.from('content_items')
        .update({ sub_category: 'אקטואליה', sub_category_id: targetSubId })
        .eq('main_category_id', videoMainId)
        .like('sub_category', '%אקטואליה%');

    if (upError) console.error('Error merging Video topics:', upError);
    else console.log('  ✅ Merged Video "אקטואליה" topics');

    // Delete redundant sub-categories
    const { error: delError } = await supabase.from('categories')
        .delete()
        .eq('parent_id', videoMainId)
        .eq('type', 'sub')
        .like('name', '%אקטואליה%')
        .neq('id', targetSubId);

    if (delError) console.error('Error deleting redundant Video sub-categories:', delError);
    else console.log('  ✅ Deleted redundant Video sub-categories');

    console.log('\n✨ cleanup complete!');
}

main().catch(console.error);
