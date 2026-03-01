
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

    // 3. CLEANUP FOR "סרטונים" (Videos)
    console.log('🎥 Processing Videos (סרטונים)...');
    const { data: videoCat } = await supabase.from('categories').select('id').eq('name', 'סרטונים').eq('type', 'main').single();

    if (videoCat) {
        // Delete sub-categories
        const { error: delError } = await supabase.from('categories').delete().eq('parent_id', videoCat.id).eq('type', 'sub');
        if (delError) console.error('Error deleting Video sub-categories:', delError);
        else console.log('  ✅ Deleted Video sub-categories');

        // Update content items
        const { error: upError } = await supabase.from('content_items').update({ sub_category: null, sub_category_id: null }).eq('main_category_id', videoCat.id);
        if (upError) console.error('Error clearing Video content items sub-categories:', upError);
        else console.log('  ✅ Cleared Video content items sub-categories');
    }

    console.log('\n✨ cleanup complete!');
}

main().catch(console.error);
