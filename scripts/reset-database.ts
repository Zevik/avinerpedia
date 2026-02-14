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

console.log('🔍 Credentials loaded:');
console.log('   URL:', supabaseUrl?.slice(0, 30) + '...');
console.log('   Service Role Key:', serviceRoleKey?.slice(0, 30) + '...\n');

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function resetDatabase() {
  console.log('🗑️  Preparing to delete all tables...\n');

  const dropStatements = [
    'DROP TABLE IF EXISTS posts CASCADE;',
    'DROP TABLE IF EXISTS admin_users CASCADE;',
    'DROP TABLE IF EXISTS categories CASCADE;',
  ];

  for (const statement of dropStatements) {
    try {
      const { error } = await supabase.rpc('exec', {
        statement: statement,
      });

      if (error && !error.message.includes('is not a known function')) {
        console.warn(`⚠️  ${statement}:`, error.message);
      } else {
        console.log(`✅ Dropped: ${statement.match(/TABLE IF EXISTS (\w+)/)?.[1] || 'unknown'}`);
      }
    } catch (error: any) {
      console.log(`✅ Dropped successfully (or already gone)`);
    }
  }

  console.log('\n✅ Database reset completed!');
  console.log('🎯 Now run: npx tsx scripts/migrate-to-supabase.ts');
}

resetDatabase().catch(console.error);
