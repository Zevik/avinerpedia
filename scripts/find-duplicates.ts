/**
 * Script to find duplicate content in the database
 * 
 * Duplicates are identified by matching:
 * - Same title
 * - Same video_id
 * - Same summary (first 100 characters)
 * 
 * Usage:
 *   npx tsx scripts/find-duplicates.ts
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

interface ContentItem {
    id: number;
    title: string;
    summary: string | null;
    video_id: string | null;
    main_category: string;
    sub_category: string | null;
}

interface DuplicateGroup {
    key: string;
    items: ContentItem[];
    duplicateCount: number;
}

async function main() {
    console.log('🔍 Finding Duplicate Content\n');

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
        console.error('❌ Missing Supabase credentials');
        process.exit(1);
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('📊 Fetching all content items...\n');

    const { data: items, error } = await supabase
        .from('content_items')
        .select('id, title, summary, video_id, main_category, sub_category')
        .order('id');

    if (error) {
        console.error('❌ Error fetching items:', error);
        process.exit(1);
    }

    console.log(`Found ${items?.length || 0} items\n`);

    // Group by different criteria
    const byTitle = new Map<string, ContentItem[]>();
    const byVideoId = new Map<string, ContentItem[]>();
    const bySummary = new Map<string, ContentItem[]>();

    items?.forEach(item => {
        // Group by title
        if (item.title) {
            const titleKey = item.title.trim().toLowerCase();
            if (!byTitle.has(titleKey)) {
                byTitle.set(titleKey, []);
            }
            byTitle.get(titleKey)!.push(item);
        }

        // Group by video_id
        if (item.video_id && !item.video_id.includes('Meir:') && !item.video_id.includes('Maale:')) {
            if (!byVideoId.has(item.video_id)) {
                byVideoId.set(item.video_id, []);
            }
            byVideoId.get(item.video_id)!.push(item);
        }

        // Group by summary (first 100 chars)
        if (item.summary && item.summary.length > 50) {
            const summaryKey = item.summary.substring(0, 100).trim();
            if (!bySummary.has(summaryKey)) {
                bySummary.set(summaryKey, []);
            }
            bySummary.get(summaryKey)!.push(item);
        }
    });

    // Find duplicates
    const duplicatesByTitle: DuplicateGroup[] = [];
    const duplicatesByVideoId: DuplicateGroup[] = [];
    const duplicatesBySummary: DuplicateGroup[] = [];

    byTitle.forEach((items, key) => {
        if (items.length > 1) {
            duplicatesByTitle.push({
                key,
                items,
                duplicateCount: items.length
            });
        }
    });

    byVideoId.forEach((items, key) => {
        if (items.length > 1) {
            duplicatesByVideoId.push({
                key,
                items,
                duplicateCount: items.length
            });
        }
    });

    bySummary.forEach((items, key) => {
        if (items.length > 1) {
            duplicatesBySummary.push({
                key,
                items,
                duplicateCount: items.length
            });
        }
    });

    // Sort by duplicate count
    duplicatesByTitle.sort((a, b) => b.duplicateCount - a.duplicateCount);
    duplicatesByVideoId.sort((a, b) => b.duplicateCount - a.duplicateCount);
    duplicatesBySummary.sort((a, b) => b.duplicateCount - a.duplicateCount);

    console.log('📈 Results:\n');
    console.log(`Duplicates by Title: ${duplicatesByTitle.length} groups`);
    console.log(`Duplicates by Video ID: ${duplicatesByVideoId.length} groups`);
    console.log(`Duplicates by Summary: ${duplicatesBySummary.length} groups`);
    console.log();

    // Calculate total duplicate items
    const totalDuplicatesByTitle = duplicatesByTitle.reduce((sum, g) => sum + (g.duplicateCount - 1), 0);
    const totalDuplicatesByVideoId = duplicatesByVideoId.reduce((sum, g) => sum + (g.duplicateCount - 1), 0);

    console.log(`Total duplicate items (by title): ${totalDuplicatesByTitle}`);
    console.log(`Total duplicate items (by video ID): ${totalDuplicatesByVideoId}`);
    console.log();

    // Show examples
    console.log('📝 Top 10 Duplicate Groups (by Video ID):\n');
    duplicatesByVideoId.slice(0, 10).forEach((group, i) => {
        console.log(`${i + 1}. Video ID: ${group.key} (${group.duplicateCount} copies)`);
        group.items.forEach(item => {
            console.log(`   - ID ${item.id}: "${item.title}" [${item.main_category}${item.sub_category ? ' > ' + item.sub_category : ''}]`);
        });
        console.log();
    });

    // Save detailed report
    const reportPath = path.join(process.cwd(), 'duplicates-report.json');
    fs.writeFileSync(reportPath, JSON.stringify({
        timestamp: new Date().toISOString(),
        summary: {
            total_items: items?.length || 0,
            duplicate_groups_by_title: duplicatesByTitle.length,
            duplicate_groups_by_video_id: duplicatesByVideoId.length,
            duplicate_groups_by_summary: duplicatesBySummary.length,
            total_duplicate_items_by_title: totalDuplicatesByTitle,
            total_duplicate_items_by_video_id: totalDuplicatesByVideoId
        },
        duplicates_by_video_id: duplicatesByVideoId,
        duplicates_by_title: duplicatesByTitle,
        duplicates_by_summary: duplicatesBySummary
    }, null, 2));

    console.log(`💾 Detailed report saved to: ${reportPath}`);
    console.log('\n✅ Analysis complete!');
}

main().catch(console.error);
