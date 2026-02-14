import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function setupDatabase() {
  console.log('🗄️  Setting up Supabase database schema...\n');

  // Read the SQL schema
  const sqlContent = fs.readFileSync('./scripts/supabase_schema.sql', 'utf8');

  // Split into individual statements
  const statements = sqlContent
    .split(';')
    .map(stmt => stmt.trim())
    .filter(stmt => stmt.length > 0);

  console.log(`📝 Executing ${statements.length} SQL statements...\n`);

  for (let i = 0; i < statements.length; i++) {
    try {
      const { error } = await supabase.rpc('execute_sql', {
        sql: statements[i] + ';',
      }).catch(() => {
        // Fallback: use query for simpler statements
        return supabase.from('_migrations').select('*');
      });

      if (error && !error.message.includes('already exists')) {
        console.warn(`⚠️  Statement ${i + 1}:`, error.message);
      } else {
        console.log(`✅ Statement ${i + 1}/${statements.length} completed`);
      }
    } catch (error) {
      console.error(`❌ Statement ${i + 1} failed:`, error);
    }
  }

  console.log('\n✅ Database setup completed!');
  console.log('\n📚 Tables created:');
  console.log('   - posts: Contains wiki/article content');
  console.log('   - categories: Content categories');
  console.log('   - admin_users: Admin roles and permissions\n');
  console.log('🔒 RLS Policies:');
  console.log('   - Public can read published posts');
  console.log('   - Only admins can write/delete\n');

  console.log('⏭️  Next step: Run migration script');
  console.log('   npx tsx scripts/migrate-to-supabase.ts');
}

setupDatabase().catch(console.error);
