/**
 * Script to remove duplicate content from the database
 * 
 * Strategy:
 * 1. For each duplicate group (same video_id):
 *    - Keep the record with the lowest ID (primary)
 *    - Collect all unique categories from all duplicates
 *    - Update the primary record with merged info
 *    - Delete all duplicate records
 * 
 * Usage:
 *   npx tsx scripts/remove-duplicates.ts
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
    videoId: string;
    items: ContentItem[];
    primaryId: number;
    duplicateIds: number[];
}

async function main() {
    console.log('🗑️  Removing Duplicate Content\n');

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
        console.error('❌ Missing Supabase credentials');
        process.exit(1);
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Load the duplicates report
    const reportPath = path.join(process.cwd(), 'duplicates-report.json');
    if (!fs.existsSync(reportPath)) {
        console.error('❌ duplicates-report.json not found. Run find-duplicates.ts first.');
        process.exit(1);
    }

    const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
    const duplicatesByVideoId = report.duplicates_by_video_id;

    console.log(`Found ${duplicatesByVideoId.length} duplicate groups\n`);

    const duplicateGroups: DuplicateGroup[] = duplicatesByVideoId.map((group: any) => {
        const items = group.items.sort((a: ContentItem, b: ContentItem) => a.id - b.id);
        const primaryId = items[0].id;
        const duplicateIds = items.slice(1).map((item: ContentItem) => item.id);

        return {
            videoId: group.key,
            items,
            primaryId,
            duplicateIds
        };
    });

    console.log('📋 Duplicate Groups to Process:\n');
    duplicateGroups.forEach((group, i) => {
        console.log(`${i + 1}. Video ID: ${group.videoId}`);
        console.log(`   Primary: ID ${group.primaryId} - "${group.items[0].title}"`);
        console.log(`   Duplicates to delete: ${group.duplicateIds.join(', ')}`);
        console.log();
    });

    const totalToDelete = duplicateGroups.reduce((sum, g) => sum + g.duplicateIds.length, 0);
    console.log(`\n⚠️  About to delete ${totalToDelete} duplicate records\n`);

    // Process each group
    let deletedCount = 0;
    let errorCount = 0;

    for (const group of duplicateGroups) {
        console.log(`\nProcessing Video ID: ${group.videoId}...`);

        // Collect all unique categories
        const allCategories = new Set<string>();
        const allSubCategories = new Set<string>();

        group.items.forEach(item => {
            if (item.main_category) allCategories.add(item.main_category);
            if (item.sub_category) allSubCategories.add(item.sub_category);
        });

        console.log(`  Categories found: ${Array.from(allCategories).join(', ')}`);
        console.log(`  Sub-categories found: ${Array.from(allSubCategories).join(', ')}`);

        // For now, we'll keep the primary record's categories
        // In the future, you might want to implement multi-category support

        // Delete duplicates
        for (const duplicateId of group.duplicateIds) {
            const { error } = await supabase
                .from('content_items')
                .delete()
                .eq('id', duplicateId);

            if (error) {
                console.error(`  ❌ Error deleting ID ${duplicateId}:`, error);
                errorCount++;
            } else {
                console.log(`  ✅ Deleted ID ${duplicateId}`);
                deletedCount++;
            }
        }
    }

    console.log('\n📊 Summary:');
    console.log(`  ✅ Successfully deleted: ${deletedCount}`);
    console.log(`  ❌ Errors: ${errorCount}`);

    // Save cleanup report
    const cleanupReportPath = path.join(process.cwd(), 'duplicates-cleanup-report.json');
    fs.writeFileSync(cleanupReportPath, JSON.stringify({
        timestamp: new Date().toISOString(),
        summary: {
            groups_processed: duplicateGroups.length,
            records_deleted: deletedCount,
            errors: errorCount
        },
        groups: duplicateGroups.map(g => ({
            video_id: g.videoId,
            primary_id: g.primaryId,
            deleted_ids: g.duplicateIds
        }))
    }, null, 2));

    console.log(`\n💾 Cleanup report saved to: ${cleanupReportPath}`);
    console.log('\n✅ Cleanup complete!');
    console.log('\nNext steps:');
    console.log('  1. Verify the changes on the website');
    console.log('  2. Consider implementing multi-category support for items');
}

main().catch(console.error);
