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

async function checkVideoIds() {
    console.log('🔍 Checking video IDs sample...');
    const { data, error } = await supabase
        .from('content_items')
        .select('id, title, video_id')
        .eq('main_category', 'סרטונים')
        .limit(20);

    if (error) {
        console.error('Error:', error);
    } else {
        data.forEach(item => {
            console.log(`[${item.id}] ${item.video_id} - ${item.title.substring(0, 30)}`);
        });
    }
}

checkVideoIds();
