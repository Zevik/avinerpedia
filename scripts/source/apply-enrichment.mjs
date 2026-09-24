// Applies the source-wiki taxonomy to Supabase.
//   node scripts/source/apply-enrichment.mjs            dry run: prints what would change
//   node scripts/source/apply-enrichment.mjs --apply    backs up content_items, then writes
// Needs support/derived/{taxonomy,enrichment-plan}.json (build-taxonomy + plan-enrichment).
// Topic/series tables are filled only when supabase/migrations/002_taxonomy.sql has been run.
import fs from 'fs';
import path from 'path';
import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config({ path: '.env.local' });
const APPLY = process.argv.includes('--apply');
const DIR = 'support/derived';
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});
const read = (f) => JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8'));

const { records, series, topics } = read('taxonomy.json');
const { plan } = read('enrichment-plan.json');
const recordById = new Map(records.map((r) => [r.source_page_id, r]));

async function check(label, promise) {
  const { data, error } = await promise;
  if (error) throw new Error(`${label}: ${error.message}`);
  return data;
}

/** Runs async jobs with a fixed concurrency. */
async function pool(items, size, fn) {
  let i = 0;
  let done = 0;
  await Promise.all(Array.from({ length: size }, async () => {
    while (i < items.length) {
      const item = items[i++];
      await fn(item);
      if (++done % 500 === 0) process.stdout.write(`  ${done}/${items.length}\n`);
    }
  }));
}

async function fetchAllContent() {
  const rows = [];
  for (let from = 0; ; from += 1000) {
    const data = await check('backup', supabase.from('content_items').select('*').order('id').range(from, from + 999));
    rows.push(...data);
    if (data.length < 1000) return rows;
  }
}

// A HEAD request reports success even for a missing table, so probe with a real select.
const hasTaxonomyTables = !(await supabase.from('topics').select('id').limit(1)).error;
console.log(`mode: ${APPLY ? 'APPLY' : 'dry run'} | taxonomy tables: ${hasTaxonomyTables ? 'present' : 'missing (run 002_taxonomy.sql to enable)'}`);

// ---------------------------------------------------------------- topics + series tables
let topicIdByName = new Map();
let seriesIdByName = new Map();
if (hasTaxonomyTables) {
  const itemCount = new Map();
  for (const r of records) for (const t of r.topics) itemCount.set(t, (itemCount.get(t) || 0) + 1);
  console.log(`topics: ${topics.length} | topic edges: ${topics.reduce((n, t) => n + t.parents.length, 0)} | series: ${series.length}`);
  if (APPLY) {
    for (let i = 0; i < topics.length; i += 500) {
      await check('topics', supabase.from('topics').upsert(
        topics.slice(i, i + 500).map((t) => ({ name: t.name, depth: t.depth, item_count: itemCount.get(t.name) || 0 })),
        { onConflict: 'name' },
      ));
    }
    const allTopics = [];
    for (let from = 0; ; from += 1000) {
      const data = await check('topics read', supabase.from('topics').select('id, name').range(from, from + 999));
      allTopics.push(...data);
      if (data.length < 1000) break;
    }
    topicIdByName = new Map(allTopics.map((t) => [t.name, t.id]));
    const edges = topics.flatMap((t) => t.parents.map((p) => ({ topic_id: topicIdByName.get(t.name), parent_id: topicIdByName.get(p) })))
      .filter((e) => e.topic_id && e.parent_id && e.topic_id !== e.parent_id);
    for (let i = 0; i < edges.length; i += 500) {
      await check('topic_parents', supabase.from('topic_parents').upsert(edges.slice(i, i + 500), { onConflict: 'topic_id,parent_id' }));
    }
    await check('series', supabase.from('series').upsert(
      series.map((s) => ({ name: s.name, detected_by: s.detected_by, episode_count: s.episodes })),
      { onConflict: 'name' },
    ));
    const allSeries = await check('series read', supabase.from('series').select('id, name'));
    seriesIdByName = new Map(allSeries.map((s) => [s.name, s.id]));
  }
}

// ---------------------------------------------------------------- per-item updates
const updates = [];
const topicLinks = [];
for (const p of plan) {
  const change = { ...p.changes };
  const src = p.source_page_id ? recordById.get(p.source_page_id) : null;
  if (src && hasTaxonomyTables) {
    Object.assign(change, {
      source_page_id: src.source_page_id,
      content_type: src.content_type,
      root_topic: src.root_topic,
      series_order: src.series ? src.series_order : null,
      source_updated_at: src.source_updated_at,
    });
    if (APPLY) change.series_id = src.series ? seriesIdByName.get(src.series) ?? null : null;
    for (const t of src.topics) topicLinks.push({ content_id: p.id, topic: t, is_primary: t === src.primary_topic });
  }
  if (Object.keys(change).length) updates.push({ id: p.id, change });
}

const fieldCounts = {};
for (const u of updates) for (const k of Object.keys(u.change)) fieldCounts[k] = (fieldCounts[k] || 0) + 1;
console.log(`items to update: ${updates.length}`, fieldCounts);
console.log(`item-topic links: ${topicLinks.length}`);

if (!APPLY) {
  console.log('\nDry run only. Re-run with --apply to write.');
  process.exit(0);
}

// Backup before any item write.
const backupDir = path.join(DIR, 'backup');
fs.mkdirSync(backupDir, { recursive: true });
const backupFile = path.join(backupDir, `content_items-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
fs.writeFileSync(backupFile, JSON.stringify(await fetchAllContent()));
console.log(`backup: ${backupFile}`);

// source_page_id is unique: clear it everywhere first so re-runs can't collide mid-way.
if (hasTaxonomyTables) {
  await check('reset source ids', supabase.from('content_items').update({ source_page_id: null }).not('source_page_id', 'is', null));
}

const failures = [];
await pool(updates, 8, async (u) => {
  const { error } = await supabase.from('content_items').update(u.change).eq('id', u.id);
  if (error) failures.push({ id: u.id, error: error.message });
});
console.log(`updated: ${updates.length - failures.length} | failed: ${failures.length}`);
if (failures.length) console.log(failures.slice(0, 5));

if (hasTaxonomyTables) {
  const rows = topicLinks
    .map((l) => ({ content_id: l.content_id, topic_id: topicIdByName.get(l.topic), is_primary: l.is_primary }))
    .filter((l) => l.topic_id);
  const ids = [...new Set(rows.map((r) => r.content_id))];
  for (let i = 0; i < ids.length; i += 500) {
    await check('content_topics clear', supabase.from('content_topics').delete().in('content_id', ids.slice(i, i + 500)));
  }
  for (let i = 0; i < rows.length; i += 1000) {
    await check('content_topics', supabase.from('content_topics').upsert(rows.slice(i, i + 1000), { onConflict: 'content_id,topic_id' }));
  }
  console.log(`content_topics: ${rows.length}`);
}

const sync = await supabase.rpc('sync_content_categories');
console.log('sync_content_categories:', sync.error ? `not run (${sync.error.message}) - run it in the SQL Editor` : sync.data);
