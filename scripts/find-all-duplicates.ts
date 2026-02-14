/**
 * Script to find ALL duplicates in the entire database
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

async function findAllDuplicates() {
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    console.log('🔍 Fetching ALL content items from database...\n');

    // Get total count first
    const { count } = await supabase
        .from('content_items')
        .select('*', { count: 'exact', head: true });

    console.log(`Total records in database: ${count}\n`);

    // Fetch all records
    const { data: items } = await supabase
        .from('content_items')
        .select('id, title, summary, video_id, main_category, sub_category')
        .order('id');

    console.log(`Fetched ${items?.length || 0} items\n`);

    // Group by title
    const byTitle = new Map<string, any[]>();
    items?.forEach(item => {
        if (item.title) {
            const key = item.title.trim();
            if (!byTitle.has(key)) {
                byTitle.set(key, []);
            }
            byTitle.get(key)!.push(item);
        }
    });

    const duplicatesByTitle: any[] = [];
    byTitle.forEach((items, key) => {
        if (items.length > 1) {
            duplicatesByTitle.push({ title: key, count: items.length, items });
        }
    });

    duplicatesByTitle.sort((a, b) => b.count - a.count);

    console.log(`Found ${duplicatesByTitle.length} duplicate title groups\n`);
    console.log('Top 20 most duplicated titles:\n');

    duplicatesByTitle.slice(0, 20).forEach((group, i) => {
        console.log(`${i + 1}. "${group.title}" - ${group.count} copies`);
        console.log(`   IDs: ${group.items.map((it: any) => it.id).join(', ')}`);
    });

    const totalDuplicates = duplicatesByTitle.reduce((sum, g) => sum + (g.count - 1), 0);
    console.log(`\n📊 Total duplicate records to remove: ${totalDuplicates}`);

    // Save full report
    const reportPath = path.join(process.cwd(), 'all-duplicates-report.json');
    fs.writeFileSync(reportPath, JSON.stringify({
        timestamp: new Date().toISOString(),
        summary: {
            total_items: items?.length || 0,
            duplicate_groups: duplicatesByTitle.length,
            total_duplicates_to_remove: totalDuplicates
        },
        duplicates: duplicatesByTitle
    }, null, 2));

    console.log(`\n💾 Full report saved to: ${reportPath}`);
}

findAllDuplicates().catch(console.error);
