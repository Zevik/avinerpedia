import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function migrateContentToSupabase() {
  console.log('🚀 Starting MDX to Supabase migration...\n');

  const contentDirectory = path.join(process.cwd(), 'content/wiki');
  
  if (!fs.existsSync(contentDirectory)) {
    console.error('❌ content/wiki directory not found');
    process.exit(1);
  }

  const files = fs.readdirSync(contentDirectory);
  const mdxFiles = files.filter(f => f.endsWith('.mdx'));

  console.log(`📄 Found ${mdxFiles.length} MDX files\n`);

  // Default category
  let defaultCategoryId: string | undefined;

  // Create default categories if they don't exist
  const defaultCategories = [
    { name: 'שיעורים', slug: 'shiurim' },
    { name: 'מאמרים', slug: 'articles' },
    { name: 'שו"ת', slug: 'shaalot-vteshuvot' },
    { name: 'כללי', slug: 'general' },
  ];

  console.log('📂 Creating default categories...');
  for (const cat of defaultCategories) {
    const { data, error } = await supabase
      .from('categories')
      .insert([{ name: cat.name, slug: cat.slug }])
      .select()
      .single();

    if (error && !error.message.includes('duplicate')) {
      console.error(`  ❌ Error creating category ${cat.name}:`, error.message);
    } else if (data) {
      console.log(`  ✅ Category created: ${cat.name}`);
      if (cat.slug === 'general') {
        defaultCategoryId = data.id;
      }
    } else {
      console.log(`  ⚠️ Category already exists: ${cat.name}`);
    }
  }

  // Get all categories for mapping
  const { data: categories } = await supabase.from('categories').select('*');
  const categoryMap: Record<string, string> = {};
  categories?.forEach(cat => {
    categoryMap[cat.name] = cat.id;
    categoryMap[cat.slug] = cat.id;
    // Map Hebrew names too
    if (cat.name === 'כללי') categoryMap['כללי'] = cat.id;
  });

  console.log('\n📤 Uploading posts to Supabase...\n');

  let successCount = 0;
  let errorCount = 0;

  for (const fileName of mdxFiles) {
    try {
      const filePath = path.join(contentDirectory, fileName);
      const fileContents = fs.readFileSync(filePath, 'utf8');
      const { data, content } = matter(fileContents);

      const slug = fileName.replace(/\.mdx$/, '');
      const title = data.title || slug;
      const postType = data.type || 'כללי';
      const categoryId = categoryMap[postType] || categoryMap['כללי'] || defaultCategoryId;

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
          console.warn(`⚠️  Already exists: ${title}`);
        } else {
          console.error(`❌ Error uploading ${title}:`, error.message);
          errorCount++;
        }
      } else {
        console.log(`✅ ${title}`);
        successCount++;
      }
    } catch (error) {
      console.error(`❌ Error processing ${fileName}:`, error);
      errorCount++;
    }
  }

  console.log(`\n✅ Migration completed!`);
  console.log(`   ✅ ${successCount} posts uploaded`);
  console.log(`   ❌ ${errorCount} errors`);
}

// Run migration
migrateContentToSupabase().catch(console.error);
