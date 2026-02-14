/**
 * Clean Import Script from WIKI Directory
 * 
 * This script:
 * 1. Reads all MDX files from content/wiki
 * 2. Parses frontmatter and content
 * 3. Detects videos (YouTube, Machon Meir)
 * 4. Imports to content_items with proper upsert
 * 
 * Usage:
 *   npx tsx scripts/import-from-wiki.ts
 */

import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { createClient } from '@supabase/supabase-js';

// Load environment variables
const envPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split(/\r?\n/).forEach(line => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) return;
        const equalIndex = trimmed.indexOf('=');
        if (equalIndex > 0) {
            const key = trimmed.substring(0, equalIndex).trim();
            const value = trimmed.substring(equalIndex + 1).trim();
            process.env[key] = value;
        }
    });
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
    console.error('❌ Missing Supabase credentials in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

// Video detection patterns
const VIDEO_PATTERNS = [
    { regex: /<machonMeeir(?:FR|IL|EN)?>(\d+)<\/machonMeeir(?:FR|IL|EN)?>/i, source: 'Maale:' },
    { regex: /video_id:\s*"?([\w-]+)"?/i, source: 'youtube' },
    { regex: /(?:youtube\.com\/watch\?v=|youtu\.be\/)([A-Za-z0-9_-]{11})/i, source: 'youtube' },
    { regex: /<iframe[^>]*src="[^"]*youtube\.com\/embed\/([A-Za-z0-9_-]{11})"/i, source: 'youtube' }
];

interface ContentRecord {
    original_id?: number;
    title: string;
    main_category: string;
    sub_category: string | null;
    video_id: string | null;
    publish_date: string | null;
    summary: string | null;
    content_md: string;
}

function detectVideo(content: string, frontmatter: any): string | null {
    // Check frontmatter first
    if (frontmatter.video_id) {
        return frontmatter.video_id;
    }

    // Check content for video patterns
    for (const pattern of VIDEO_PATTERNS) {
        const match = content.match(pattern.regex);
        if (match && match[1]) {
            return pattern.source === 'Maale:' ? `Maale:${match[1]}` : match[1];
        }
    }

    return null;
}

function determineCategory(videoId: string | null, subCategory: string, content: string): string {
    const lowerType = subCategory.toLowerCase();

    // 1. Check for Series (סדרות) - highest priority
    // Includes: "אורות התחיה (סדרות)", "עין איה - ברכות ב' (סדרות)", "כוזרי (סדרות)", etc.
    if (lowerType.includes('סדרות') || lowerType.includes('(סדרה)') || lowerType.includes('סדרה')) {
        return 'סדרות';
    }

    // 2. Check for Q&A (שו"ת הלכה) - ONLY שו"ת, not הלכה alone
    // "הלכה" alone is just a regular article topic, not Q&A
    if (lowerType.includes('שו"ת') || lowerType.includes('שו\\"ת') ||
        content.includes('שאלה:') || content.includes('ש:')) {
        return 'שו"ת הלכה';
    }

    // 3. Check for Videos (סרטונים)
    // Includes: "וידאו", "סרטונים", or has video_id
    if (videoId || lowerType.includes('וידאו') || lowerType.includes('סרטונים')) {
        return 'סרטונים';
    }

    // 4. Default to Articles (מאמרים)
    // Includes: "מאמר", "מאמרים", "כללי", "הלכה", and everything else
    return 'מאמרים';
}

async function importFromWiki() {
    console.log('🚀 Starting Clean Import from WIKI Directory\n');

    const wikiDirectory = path.join(process.cwd(), 'content', 'wiki');

    if (!fs.existsSync(wikiDirectory)) {
        console.error(`❌ WIKI directory not found: ${wikiDirectory}`);
        process.exit(1);
    }

    const files = fs.readdirSync(wikiDirectory).filter(f => f.endsWith('.mdx'));
    console.log(`📄 Found ${files.length} MDX files\n`);

    let successCount = 0;
    let videoCount = 0;
    let errorCount = 0;
    const errors: Array<{ file: string; error: string }> = [];

    const BATCH_SIZE = 50;

    for (let i = 0; i < files.length; i += BATCH_SIZE) {
        const batch = files.slice(i, i + BATCH_SIZE);
        const batchNum = Math.floor(i / BATCH_SIZE) + 1;
        const totalBatches = Math.ceil(files.length / BATCH_SIZE);

        console.log(`📦 Processing batch ${batchNum}/${totalBatches}...`);

        const recordsToInsert: ContentRecord[] = [];

        for (const fileName of batch) {
            try {
                const filePath = path.join(wikiDirectory, fileName);
                const fileContents = fs.readFileSync(filePath, 'utf8');
                const { data: frontmatter, content } = matter(fileContents);

                const slug = fileName.replace(/\.mdx$/, '');
                const title = frontmatter.title || slug;
                const subCategory = frontmatter.type || 'כללי';
                const videoId = detectVideo(content, frontmatter);
                const mainCategory = determineCategory(videoId, subCategory, content);

                if (videoId) {
                    videoCount++;
                }

                // Create summary from content (first 200 chars, thoroughly cleaned)
                const summary = content
                    .replace(/<[^>]*>/g, '') // Remove all HTML tags
                    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Remove markdown links, keep text
                    .replace(/[#*`_~\[\]]/g, '') // Remove markdown formatting characters
                    .replace(/\s+/g, ' ') // Normalize all whitespace to single spaces
                    .substring(0, 200)
                    .trim();


                recordsToInsert.push({
                    original_id: frontmatter.id || null,
                    title,
                    main_category: mainCategory,
                    sub_category: subCategory,
                    video_id: videoId,
                    publish_date: frontmatter.date || null,
                    summary: summary.length > 3 ? summary : null,
                    content_md: content.trim()
                });

            } catch (err) {
                const errorMsg = err instanceof Error ? err.message : String(err);
                console.error(`  ❌ Error parsing ${fileName}: ${errorMsg}`);
                errors.push({ file: fileName, error: errorMsg });
                errorCount++;
            }
        }

        // Insert batch with upsert on title
        if (recordsToInsert.length > 0) {
            const { data, error } = await supabase
                .from('content_items')
                .upsert(recordsToInsert, {
                    onConflict: 'title',
                    ignoreDuplicates: false
                })
                .select();

            if (error) {
                console.error(`  ❌ Batch insert error: ${error.message}`);
                errorCount += recordsToInsert.length;
            } else {
                successCount += data?.length || recordsToInsert.length;
                console.log(`  ✅ Inserted ${recordsToInsert.length} records (${successCount} total)`);
            }
        }

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log('\n📊 Import Summary:');
    console.log(`  ✅ Successfully imported: ${successCount}`);
    console.log(`  🎥 Videos detected: ${videoCount}`);
    console.log(`  ❌ Errors: ${errorCount}`);

    if (errors.length > 0) {
        console.log('\n⚠️  Error Details:');
        errors.slice(0, 10).forEach(({ file, error }) => {
            console.log(`  - ${file}: ${error}`);
        });
        if (errors.length > 10) {
            console.log(`  ... and ${errors.length - 10} more errors`);
        }
    }

    // Save error log
    if (errors.length > 0) {
        const errorLogPath = path.join(process.cwd(), 'import-errors.json');
        fs.writeFileSync(errorLogPath, JSON.stringify(errors, null, 2));
        console.log(`\n💾 Error log saved to: ${errorLogPath}`);
    }

    console.log('\n✨ Import Complete!');
}

importFromWiki().catch(console.error);
