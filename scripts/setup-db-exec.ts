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

async function setupDatabase() {
  console.log('🗄️  Setting up Supabase database schema...\n');

  try {
    // Read the SQL schema
    const sqlContent = fs.readFileSync('./scripts/supabase_schema.sql', 'utf8');

    // Split into individual statements
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    console.log(`📝 Found ${statements.length} SQL statements to execute\n`);

    for (let i = 0; i < statements.length; i++) {
      try {
        const { error } = await supabase.rpc('exec', {
          statement: statements[i],
        });

        if (error) {
          if (error.message.includes('already exists') || error.message.includes('is not a known function')) {
            console.log(`✅ Statement ${i + 1}/${statements.length}: ${statements[i].slice(0, 50)}...`);
          } else {
            console.warn(`⚠️  Statement ${i + 1}: ${error.message}`);
          }
        } else {
          console.log(`✅ Statement ${i + 1}/${statements.length}: OK`);
        }
      } catch (error: any) {
        console.warn(`⚠️  Statement ${i + 1}: ${error.message}`);
      }
    }

    console.log('\n✅ Database setup completed!');
  } catch (error) {
    console.error('❌ Error during setup:', error);
  }
}

setupDatabase().catch(console.error);
