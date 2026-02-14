/**
 * Script to clean and fix malformed YouTube video IDs
 * 
 * Common issues:
 * - Leading slash: /videoId -> videoId
 * - Full URL: http://youtu.be/videoId -> videoId
 * - Invalid IDs: "related", "blog/123", etc.
 * 
 * Usage:
 *   npx tsx scripts/fix-youtube-ids.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

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

interface FixResult {
    id: number;
    title: string;
    old_video_id: string;
    new_video_id: string | null;
    action: 'fixed' | 'invalid' | 'unchanged';
}

/**
 * Clean and extract YouTube video ID from various formats
 */
function cleanYouTubeId(videoId: string): { cleaned: string | null; action: 'fixed' | 'invalid' | 'unchanged' } {
    if (!videoId) {
        return { cleaned: null, action: 'invalid' };
    }

    const original = videoId;
    let cleaned = videoId.trim();

    // Remove leading slash
    if (cleaned.startsWith('/')) {
        cleaned = cleaned.substring(1);
    }

    // Extract from full YouTube URLs
    const urlPatterns = [
        /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
        /(?:https?:\/\/)?(?:www\.)?youtu\.be\/([a-zA-Z0-9_-]{11})/,
        /(?:https?:\/\/)?(?:www\.)?youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
    ];

    for (const pattern of urlPatterns) {
        const match = cleaned.match(pattern);
        if (match) {
            cleaned = match[1];
            break;
        }
    }

    // Validate YouTube ID format (11 characters, alphanumeric + _ and -)
    const isValidFormat = /^[a-zA-Z0-9_-]{11}$/.test(cleaned);

    if (!isValidFormat) {
        // Check for common invalid patterns
        const invalidPatterns = ['related', 'blog/', 'jdfk8dflo4ru'];
        if (invalidPatterns.some(p => cleaned.includes(p))) {
            return { cleaned: null, action: 'invalid' };
        }

        // If it's close to valid length, might be fixable
        if (cleaned.length >= 10 && cleaned.length <= 12) {
            // Try to extract valid characters
            const extracted = cleaned.match(/[a-zA-Z0-9_-]{11}/);
            if (extracted) {
                cleaned = extracted[0];
                return { cleaned, action: 'fixed' };
            }
        }

        return { cleaned: null, action: 'invalid' };
    }

    return {
        cleaned,
        action: cleaned === original ? 'unchanged' : 'fixed'
    };
}

async function main() {
    console.log('🔧 YouTube Video ID Cleanup Script\n');

    // Initialize Supabase
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
        console.error('❌ Missing Supabase credentials in .env.local');
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

    console.log(`Found ${contentItems?.length || 0} YouTube videos\n`);

    // Process each video ID
    const results: FixResult[] = [];
    const toUpdate: Array<{ id: number; video_id: string | null }> = [];

    contentItems?.forEach(item => {
        const { cleaned, action } = cleanYouTubeId(item.video_id!);

        results.push({
            id: item.id,
            title: item.title,
            old_video_id: item.video_id!,
            new_video_id: cleaned,
            action
        });

        if (action === 'fixed' || action === 'invalid') {
            toUpdate.push({
                id: item.id,
                video_id: cleaned
            });
        }
    });

    // Summary
    const fixed = results.filter(r => r.action === 'fixed');
    const invalid = results.filter(r => r.action === 'invalid');
    const unchanged = results.filter(r => r.action === 'unchanged');

    console.log('📈 Analysis Results:');
    console.log(`  ✅ Unchanged: ${unchanged.length}`);
    console.log(`  🔧 Fixed: ${fixed.length}`);
    console.log(`  ❌ Invalid (will be set to null): ${invalid.length}`);
    console.log();

    if (fixed.length > 0) {
        console.log('🔧 Fixed IDs (first 10):');
        fixed.slice(0, 10).forEach(r => {
            console.log(`  ID ${r.id}: "${r.old_video_id}" → "${r.new_video_id}"`);
        });
        if (fixed.length > 10) {
            console.log(`  ... and ${fixed.length - 10} more`);
        }
        console.log();
    }

    if (invalid.length > 0) {
        console.log('❌ Invalid IDs (will be set to null):');
        invalid.slice(0, 10).forEach(r => {
            console.log(`  ID ${r.id}: "${r.old_video_id}"`);
            console.log(`     Title: "${r.title}"`);
        });
        if (invalid.length > 10) {
            console.log(`  ... and ${invalid.length - 10} more`);
        }
        console.log();
    }

    if (toUpdate.length === 0) {
        console.log('✅ No updates needed!');
        return;
    }

    // Ask for confirmation
    console.log(`\n⚠️  About to update ${toUpdate.length} records in the database.`);
    console.log('   - Fixed IDs will be corrected');
    console.log('   - Invalid IDs will be set to NULL\n');

    // Update database
    console.log('💾 Updating database...\n');

    let successCount = 0;
    let errorCount = 0;

    for (const update of toUpdate) {
        const { error } = await supabase
            .from('content_items')
            .update({ video_id: update.video_id })
            .eq('id', update.id);

        if (error) {
            console.error(`❌ Error updating ID ${update.id}:`, error);
            errorCount++;
        } else {
            successCount++;
        }
    }

    console.log(`\n✅ Update complete!`);
    console.log(`   - Success: ${successCount}`);
    console.log(`   - Errors: ${errorCount}`);

    // Save report
    const reportPath = path.join(process.cwd(), 'video-id-cleanup-report.json');
    fs.writeFileSync(reportPath, JSON.stringify({
        timestamp: new Date().toISOString(),
        summary: {
            total: results.length,
            unchanged: unchanged.length,
            fixed: fixed.length,
            invalid: invalid.length,
            updated: successCount,
            errors: errorCount
        },
        fixed_ids: fixed,
        invalid_ids: invalid
    }, null, 2));

    console.log(`\n💾 Detailed report saved to: ${reportPath}`);
    console.log('\n✅ Cleanup complete!');
    console.log('\nNext step: Run validate-youtube-videos.ts again to check the cleaned IDs');
}

main().catch(console.error);
