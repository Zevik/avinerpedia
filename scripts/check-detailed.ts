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

const supabaseUrl = env['NEXT_PUBLIC_SUPABASE_URL'];
const serviceRoleKey = env['SUPABASE_SERVICE_ROLE_KEY'];

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function checkDetailedStats() {
    console.log('🔍 Detailed Statistics Check...\n');

    // Check content_items
    const { count: itemsCount, error: itemsError } = await supabase
        .from('content_items')
        .select('*', { count: 'exact', head: true });

    const { count: videoItemsCount, error: videoItemsError } = await supabase
        .from('content_items')
        .select('*', { count: 'exact', head: true })
        .eq('main_category', 'סרטונים');

    // Check posts
    const { count: postsCount, error: postsError } = await supabase
        .from('posts')
        .select('*', { count: 'exact', head: true });

    console.log('✅ Supabase Counts:');
    console.log(`   📦 Table [content_items]: ${itemsCount || 0} items`);
    console.log(`      🎥 Videos in [content_items]: ${videoItemsCount || 0}`);
    console.log(`   📝 Table [posts]: ${postsCount || 0} items`);

    if (itemsError) console.error('Error content_items:', itemsError.message);
    if (postsError) console.error('Error posts:', postsError.message);
}

checkDetailedStats().catch(console.error);
