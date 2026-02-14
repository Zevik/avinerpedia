/**
 * Script to validate YouTube videos and identify unavailable ones
 * 
 * Usage:
 *   npx tsx scripts/validate-youtube-videos.ts
 */

import { createClient } from '@supabase/supabase-js';
import { batchCheckVideos } from '../lib/youtube-api';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables
const envPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    // Handle both \n and \r\n line endings
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

// Debug: Check if API key is loaded
console.log('Environment check:');
console.log('- YOUTUBE_API_KEY:', process.env.YOUTUBE_API_KEY ? `Found (${process.env.YOUTUBE_API_KEY.substring(0, 10)}...)` : 'Missing');
console.log();

interface VideoRecord {
    id: number;
    title: string;
    video_id: string;
    table: 'content_items' | 'posts';
}

async function main() {
    console.log('🎬 YouTube Video Validation Script\n');

    // Initialize Supabase
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
        console.error('❌ Missing Supabase credentials in .env.local');
        process.exit(1);
    }

    if (!process.env.YOUTUBE_API_KEY) {
        console.error('❌ Missing YOUTUBE_API_KEY in .env.local');
        process.exit(1);
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch all YouTube videos from content_items
    console.log('📊 Fetching YouTube videos from database...\n');

    const { data: contentItems, error: contentError } = await supabase
        .from('content_items')
        .select('id, title, video_id')
        .not('video_id', 'is', null)
        .not('video_id', 'like', 'Meir:%')
        .not('video_id', 'like', 'Maale:%');

    if (contentError) {
        console.error('❌ Error fetching content_items:', contentError);
        process.exit(1);
    }

    // Fetch all YouTube videos from posts
    const { data: posts, error: postsError } = await supabase
        .from('posts')
        .select('id, title, content')
        .eq('status', 'published')
        .not('content', 'is', null);

    if (postsError) {
        console.error('❌ Error fetching posts:', postsError);
        process.exit(1);
    }

    // Extract YouTube IDs from posts content
    const postsWithYouTube: VideoRecord[] = [];
    posts?.forEach(post => {
        const youtubeMatch = post.content?.match(/<youtube>([^<]+)<\/youtube>/);
        if (youtubeMatch) {
            postsWithYouTube.push({
                id: post.id,
                title: post.title,
                video_id: youtubeMatch[1].trim(),
                table: 'posts'
            });
        }
    });

    // Combine all records
    const allRecords: VideoRecord[] = [
        ...(contentItems?.map(item => ({
            id: item.id,
            title: item.title,
            video_id: item.video_id!,
            table: 'content_items' as const
        })) || []),
        ...postsWithYouTube
    ];

    console.log(`Found ${allRecords.length} YouTube videos:`);
    console.log(`  - ${contentItems?.length || 0} from content_items`);
    console.log(`  - ${postsWithYouTube.length} from posts`);
    console.log();

    if (allRecords.length === 0) {
        console.log('✅ No YouTube videos to check');
        return;
    }

    // Extract unique video IDs
    const uniqueVideoIds = Array.from(new Set(allRecords.map(r => r.video_id)));
    console.log(`Unique video IDs: ${uniqueVideoIds.length}\n`);

    // Check availability
    console.log('🔍 Checking video availability with YouTube API...\n');

    let available: string[] = [];
    let unavailable: string[] = [];

    try {
        const result = await batchCheckVideos(uniqueVideoIds);
        available = result.available;
        unavailable = result.unavailable;
    } catch (error) {
        console.error('\n❌ Error during video validation:');
        console.error(error);
        process.exit(1);
    }

    console.log('\n📈 Results:');
    console.log(`  ✅ Available: ${available.length}`);
    console.log(`  ❌ Unavailable: ${unavailable.length}`);
    console.log();

    if (unavailable.length === 0) {
        console.log('🎉 All videos are available!');
        return;
    }

    // Find records with unavailable videos
    const unavailableRecords = allRecords.filter(r =>
        unavailable.includes(r.video_id)
    );

    console.log(`\n❌ Found ${unavailableRecords.length} records with unavailable videos:\n`);

    // Group by table
    const byTable = {
        content_items: unavailableRecords.filter(r => r.table === 'content_items'),
        posts: unavailableRecords.filter(r => r.table === 'posts')
    };

    console.log(`📋 Breakdown:`);
    console.log(`  - content_items: ${byTable.content_items.length}`);
    console.log(`  - posts: ${byTable.posts.length}`);
    console.log();

    // Show first 10 examples
    console.log('📝 Examples (first 10):');
    unavailableRecords.slice(0, 10).forEach((record, i) => {
        console.log(`  ${i + 1}. [${record.table}] ID ${record.id}: "${record.title}"`);
        console.log(`     Video ID: ${record.video_id}`);
    });

    if (unavailableRecords.length > 10) {
        console.log(`  ... and ${unavailableRecords.length - 10} more`);
    }

    // Save detailed report
    const reportPath = path.join(process.cwd(), 'unavailable-videos-report.json');
    fs.writeFileSync(reportPath, JSON.stringify({
        timestamp: new Date().toISOString(),
        summary: {
            total_checked: allRecords.length,
            unique_videos: uniqueVideoIds.length,
            available: available.length,
            unavailable: unavailable.length
        },
        unavailable_records: unavailableRecords
    }, null, 2));

    console.log(`\n💾 Detailed report saved to: ${reportPath}`);
    console.log('\n✅ Validation complete!');
    console.log('\nNext steps:');
    console.log('  1. Review the report file');
    console.log('  2. Decide what to do with unavailable videos');
    console.log('  3. Run cleanup script (to be created)');
}

main().catch(console.error);
