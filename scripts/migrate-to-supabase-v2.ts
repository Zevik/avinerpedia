import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { createClient } from '@supabase/supabase-js';

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

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function migrateContentToSupabase() {
  console.log('🚀 Starting MDX to Supabase migration...\n');

  const contentDirectory = path.join(process.cwd(), 'content/wiki');
  const files = fs.readdirSync(contentDirectory);
  const mdxFiles = files.filter(f => f.endsWith('.mdx'));

  console.log(`📄 Found ${mdxFiles.length} MDX files\n`);

  // Get all categories for mapping
  const { data: categories } = await supabase.from('categories').select('*');
  const categoryMap: Record<string, string> = {};
  
  if (categories && categories.length > 0) {
    categories.forEach(cat => {
      categoryMap[cat.name] = cat.id;
      categoryMap[cat.slug] = cat.id;
    });
  }

  console.log('📤 Processing files...\n');

  let successCount = 0;
  let errorCount = 0;
  let duplicateCount = 0;
  const errors: string[] = [];

  for (let i = 0; i < mdxFiles.length; i++) {
    const fileName = mdxFiles[i];
    
    try {
      const filePath = path.join(contentDirectory, fileName);
      const fileContents = fs.readFileSync(filePath, 'utf8');
      const { data, content } = matter(fileContents);

      const slug = fileName.replace(/\.mdx$/, '');
      const title = data.title || slug;
      const postType = data.type || 'כללי';
      const categoryId = categoryMap[postType] || categoryMap['כללי'] || categories?.[0]?.id;

      const { error } = await supabase.from('posts').insert([
        {
          title,
          slug,
          content: content.trim(),
          category_id: categoryId,
          status: 'published',
        },
      ]);

      if (error) {
        if (error.message.includes('duplicate')) {
          duplicateCount++;
        } else {
          errorCount++;
          errors.push(`${fileName}: ${error.message}`);
        }
      } else {
        successCount++;
      }

      // Progress report every 500 files
      if ((i + 1) % 500 === 0) {
        console.log(`[${i + 1}/${mdxFiles.length}] Progress: ✅ ${successCount}, ⚠️ ${duplicateCount}, ❌ ${errorCount}`);
      }
    } catch (error: any) {
      errorCount++;
      errors.push(`${fileName}: ${error.message}`);
    }
  }

  console.log(`\n✅ Migration completed!`);
  console.log(`   ✅ Successfully uploaded: ${successCount}`);
  console.log(`   ⚠️  Already existed (duplicates): ${duplicateCount}`);
  console.log(`   ❌ Errors: ${errorCount}`);
  console.log(`   📊 Total processed: ${successCount + duplicateCount + errorCount}/${mdxFiles.length}`);

  if (errors.length > 0 && errors.length <= 10) {
    console.log(`\n⚠️  First errors:`);
    errors.slice(0, 10).forEach(err => console.log(`   - ${err}`));
  }
}

migrateContentToSupabase().catch(console.error);
