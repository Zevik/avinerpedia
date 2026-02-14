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
    console.error('❌ Missing Supabase credentials in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

// Video detection patterns
const VIDEO_PATTERNS = [
    { regex: /<machonMeeir(?:FR|IL|EN)?>(\d+)<\/machonMeeir(?:FR|IL|EN)?>/i, source: 'Maale:' },
    { regex: /video_id:\s*"?([\w-]+)"?/i, source: 'youtube' },
    { regex: /(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/i, source: 'youtube' },
    { regex: /<iframe[^>]*src="[^"]*youtube\.com\/embed\/([\w-]+)"/i, source: 'youtube' }
];

async function migrateAll() {
    console.log('🚀 Starting Comprehensive Migration...\n');

    const contentDirectory = path.join(process.cwd(), 'content/wiki');
    const files = fs.readdirSync(contentDirectory).filter(f => f.endsWith('.mdx'));
    console.log(`📄 Found ${files.length} MDX files.`);

    // Load existing categories
    const { data: categories } = await supabase.from('categories').select('*');
    const categoryMap: Record<string, string> = {};
    categories?.forEach(cat => {
        categoryMap[cat.name] = cat.id;
    });

    let successCount = 0;
    let videoCount = 0;
    let errorCount = 0;

    // Process in batches to avoid overwhelming Supabase
    const BATCH_SIZE = 50;
    for (let i = 0; i < files.length; i += BATCH_SIZE) {
        const batch = files.slice(i, i + BATCH_SIZE);
        console.log(`📦 Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(files.length / BATCH_SIZE)}...`);

        const postsToInsert: any[] = [];
        const contentItemsToInsert: any[] = [];

        for (const fileName of batch) {
            try {
                const filePath = path.join(contentDirectory, fileName);
                const fileContents = fs.readFileSync(filePath, 'utf8');
                const { data, content } = matter(fileContents);
                const slug = fileName.replace(/\.mdx$/, '');

                let videoId: string | null = null;
                for (const pattern of VIDEO_PATTERNS) {
                    const match = content.match(pattern.regex) || (data.video_id && { 1: data.video_id });
                    if (match && match[1]) {
                        videoId = pattern.source === 'Maale:' ? `Maale:${match[1]}` : match[1];
                        break;
                    }
                }

                const title = data.title || slug;
                const subCategory = data.type || 'כללי';

                // Determine main category
                let mainCategory = 'מאמרים';
                if (videoId) {
                    mainCategory = 'סרטונים';
                    videoCount++;
                } else if (subCategory.includes('שו"ת') || content.includes('שאלה:') || content.includes('ש:')) {
                    mainCategory = 'שו"ת הלכה';
                }

                // Prepare for 'posts' table (Wiki)
                postsToInsert.push({
                    title,
                    slug,
                    content: content.trim(),
                    category_id: categoryMap[subCategory] || categoryMap['כללי'],
                    status: 'published'
                });

                // Prepare for 'content_items' table (Galleries)
                contentItemsToInsert.push({
                    title,
                    main_category: mainCategory,
                    sub_category: subCategory,
                    video_id: videoId,
                    content_md: content.trim(),
                    summary: content.substring(0, 200).replace(/[#*`]/g, '') + '...'
                });

            } catch (err) {
                console.error(`❌ Error parsing ${fileName}:`, err);
                errorCount++;
            }
        }

        // Upsert posts
        const { error: postsError } = await supabase.from('posts').upsert(postsToInsert, { onConflict: 'slug' });
        if (postsError) {
            console.error(`❌ Batch error (posts):`, postsError.message);
            errorCount += batch.length;
        } else {
            // For content_items, we'll try to insert/upsert without a strict constraint if it's causing issues
            // or simply rely on the 'posts' table which is the main source for the Wiki.
            const { error: itemsError } = await supabase.from('content_items').upsert(contentItemsToInsert, { onConflict: 'title' });
            if (itemsError) {
                // If 'title' is also not a unique constraint, we'll just insert and ignore duplicates for now
                // or log it. Most Supabase tables have an 'id' or 'title' index.
                const { error: retryError } = await supabase.from('content_items').insert(contentItemsToInsert);
                if (retryError) {
                    console.error(`❌ Batch error (content_items):`, retryError.message);
                }
            }
            successCount += batch.length;
        }

        process.stdout.write(`   ✅ ${successCount} processed (${videoCount} videos found)\r`);
    }

    console.log(`\n\n✨ Migration Completed!`);
    console.log(`   ✅ Success: ${successCount}`);
    console.log(`   🎥 Videos: ${videoCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);
}

migrateAll().catch(console.error);
