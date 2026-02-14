import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkTypes() {
    console.log('🔍 Checking database types...');

    // Check content_items columns
    const { data: contentColumns, error: contentError } = await supabase
        .rpc('get_column_types', { table_name: 'content_items' });

    if (contentError) {
        // Fallback: try selecting one row to see types roughly, or just log error
        console.log('Error getting content_items types via RPC:', contentError.message);
    } else {
        console.log('📄 content_items columns:', contentColumns);
    }

    // Check categories columns (if table exists)
    const { data: catColumns, error: catError } = await supabase
        .rpc('get_column_types', { table_name: 'categories' });

    if (catError) {
        console.log('Error or table categories does not exist:', catError.message);
    } else {
        console.log('📂 categories columns:', catColumns);
    }
}

// Helper RPC might not exist, so let's try a direct SQL query if possible or just infer
// Actually, supabase-js doesn't let us run arbitrary SQL easily without a function.
// Let's try to infer from a sample select.

async function inferTypes() {
    console.log('\n🕵️ Inferring types from data sample...');

    // Check content_items ID type
    const { data: items } = await supabase.from('content_items').select('id').limit(1);
    if (items && items.length > 0) {
        console.log('Sample content_item ID:', items[0].id, '(Type:', typeof items[0].id, ')');
    }

    // Check categories ID type
    const { data: cats } = await supabase.from('categories').select('id').limit(1);
    if (cats && cats.length > 0) {
        console.log('Sample category ID:', cats[0].id, '(Type:', typeof cats[0].id, ')');
    }
}

checkTypes();
inferTypes();
