/**
 * Comprehensive Duplicate Removal Script
 * 
 * This script will:
 * 1. Fetch ALL records from content_items (using pagination)
 * 2. Group by title to find duplicates
 * 3. Keep the record with the lowest ID (primary)
 * 4. Delete all duplicates
 * 
 * Expected: Remove ~17,500 duplicate records
 * 
 * Usage:
 *   npx tsx scripts/remove-all-duplicates.ts
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
    main_category: string;
    sub_category: string | null;
}

async function fetchAllRecords(supabase: any): Promise<ContentItem[]> {
    const allRecords: ContentItem[] = [];
    const pageSize = 1000;
    let page = 0;
    let hasMore = true;

    console.log('📥 Fetching all records from database...\n');

    while (hasMore) {
        const { data, error } = await supabase
            .from('content_items')
            .select('id, title, main_category, sub_category')
            .range(page * pageSize, (page + 1) * pageSize - 1)
            .order('id');

        if (error) {
            console.error('Error fetching page', page, ':', error);
            break;
        }

        if (data && data.length > 0) {
            allRecords.push(...data);
            console.log(`  Fetched page ${page + 1}: ${data.length} records (total: ${allRecords.length})`);
            page++;

            if (data.length < pageSize) {
                hasMore = false;
            }
        } else {
            hasMore = false;
        }
    }

    console.log(`\n✅ Total records fetched: ${allRecords.length}\n`);
    return allRecords;
}

async function main() {
    console.log('🗑️  Comprehensive Duplicate Removal\n');

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
        console.error('❌ Missing Supabase credentials');
        process.exit(1);
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch all records
    const allRecords = await fetchAllRecords(supabase);

    // Group by title
    console.log('🔍 Grouping by title to find duplicates...\n');
    const byTitle = new Map<string, ContentItem[]>();

    allRecords.forEach(item => {
        const key = item.title.trim();
        if (!byTitle.has(key)) {
            byTitle.set(key, []);
        }
        byTitle.get(key)!.push(item);
    });

    // Find duplicates
    const duplicateGroups: Array<{
        title: string;
        items: ContentItem[];
        primaryId: number;
        duplicateIds: number[];
    }> = [];

    byTitle.forEach((items, title) => {
        if (items.length > 1) {
            // Sort by ID to get the primary (lowest ID)
            items.sort((a, b) => a.id - b.id);
            const primaryId = items[0].id;
            const duplicateIds = items.slice(1).map(item => item.id);

            duplicateGroups.push({
                title,
                items,
                primaryId,
                duplicateIds
            });
        }
    });

    // Sort by number of duplicates (most duplicated first)
    duplicateGroups.sort((a, b) => b.duplicateIds.length - a.duplicateIds.length);

    const totalDuplicates = duplicateGroups.reduce((sum, g) => sum + g.duplicateIds.length, 0);

    console.log(`📊 Analysis Results:`);
    console.log(`  Total records: ${allRecords.length}`);
    console.log(`  Unique titles: ${byTitle.size}`);
    console.log(`  Duplicate groups: ${duplicateGroups.length}`);
    console.log(`  Total duplicates to remove: ${totalDuplicates}`);
    console.log();

    console.log('📝 Top 10 most duplicated titles:\n');
    duplicateGroups.slice(0, 10).forEach((group, i) => {
        console.log(`${i + 1}. "${group.title}" - ${group.items.length} copies`);
        console.log(`   Primary: ID ${group.primaryId}`);
        console.log(`   Duplicates: ${group.duplicateIds.slice(0, 5).join(', ')}${group.duplicateIds.length > 5 ? '...' : ''}`);
        console.log();
    });

    console.log(`\n⚠️  About to delete ${totalDuplicates} duplicate records!\n`);
    console.log('Starting deletion in 3 seconds...\n');

    await new Promise(resolve => setTimeout(resolve, 3000));

    // Delete duplicates in batches
    let deletedCount = 0;
    let errorCount = 0;
    const batchSize = 100;

    const allDuplicateIds = duplicateGroups.flatMap(g => g.duplicateIds);

    console.log(`Deleting ${allDuplicateIds.length} records in batches of ${batchSize}...\n`);

    for (let i = 0; i < allDuplicateIds.length; i += batchSize) {
        const batch = allDuplicateIds.slice(i, i + batchSize);

        const { error } = await supabase
            .from('content_items')
            .delete()
            .in('id', batch);

        if (error) {
            console.error(`❌ Error deleting batch ${Math.floor(i / batchSize) + 1}:`, error);
            errorCount += batch.length;
        } else {
            deletedCount += batch.length;
            console.log(`✅ Deleted batch ${Math.floor(i / batchSize) + 1}: ${deletedCount}/${allDuplicateIds.length}`);
        }
    }

    console.log('\n📊 Final Summary:');
    console.log(`  ✅ Successfully deleted: ${deletedCount}`);
    console.log(`  ❌ Errors: ${errorCount}`);
    console.log(`  📝 Remaining records: ${allRecords.length - deletedCount}`);

    // Save detailed report
    const reportPath = path.join(process.cwd(), 'comprehensive-cleanup-report.json');
    fs.writeFileSync(reportPath, JSON.stringify({
        timestamp: new Date().toISOString(),
        summary: {
            total_records_before: allRecords.length,
            unique_titles: byTitle.size,
            duplicate_groups: duplicateGroups.length,
            total_duplicates: totalDuplicates,
            deleted: deletedCount,
            errors: errorCount,
            remaining: allRecords.length - deletedCount
        },
        top_duplicates: duplicateGroups.slice(0, 50).map(g => ({
            title: g.title,
            count: g.items.length,
            primary_id: g.primaryId,
            duplicate_ids: g.duplicateIds
        }))
    }, null, 2));

    console.log(`\n💾 Detailed report saved to: ${reportPath}`);
    console.log('\n✅ Cleanup complete!');
}

main().catch(console.error);
