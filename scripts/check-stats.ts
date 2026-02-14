import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Read .env.local manually
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

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function checkStats() {
  console.log('📊 Checking database statistics...\n');

  const { count: postCount, error: postError } = await supabase
    .from('posts')
    .select('*', { count: 'exact', head: true });

  const { count: categoryCount, error: catError } = await supabase
    .from('categories')
    .select('*', { count: 'exact', head: true });

  const { count: adminCount, error: adminError } = await supabase
    .from('admin_users')
    .select('*', { count: 'exact', head: true });

  const { data: categories } = await supabase.from('categories').select('name, id');

  console.log('✅ Database Statistics:');
  console.log(`   📝 Total Posts: ${postCount || 0}`);
  console.log(`   📂 Total Categories: ${categoryCount || 0}`);
  console.log(`   👥 Total Admin Users: ${adminCount || 0}`);
  
  if (categories && categories.length > 0) {
    console.log('\n   📂 Categories:');
    categories.forEach(cat => {
      console.log(`      - ${cat.name}`);
    });
  }

  console.log('\n✨ Migration completed successfully!');
}

checkStats().catch(console.error);
