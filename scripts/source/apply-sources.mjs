// Assigns content_items.source_id (the "source" axis of /library; migration 004).
//   node scripts/source/apply-sources.mjs           dry run: counts and overlaps
//   node scripts/source/apply-sources.mjs --apply   backup, then write (idempotent)
// Rules, first match wins:
//   machon-meir       a Machon Meir video (video_id "Meir:…") or the source's "מכון מאיר" category
//   shut-sms          titled "שו"ת סמס…" or in the "דפים קא' - ר'" collection
//   ateret / tweets / poems / special-articles   from source_collection (apply-topic-taxonomy.mjs)
// Re-run after apply-topic-taxonomy.mjs (it rewrites source_collection), then npm run revalidate.
import fs from 'fs';
import path from 'path';
import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config({ path: '.env.local', quiet: true });
const APPLY = process.argv.includes('--apply');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const COLLECTION_SOURCE = {
  'ישיבת עטרת ירושלים': 'ateret',
  "דפים קא' - ר'": 'shut-sms',
  'ציוצים': 'tweets',
  'שירים': 'poems',
  'מאמרים מיוחדים': 'special-articles',
};
const { records } = JSON.parse(fs.readFileSync('support/derived/taxonomy.json', 'utf8'));
const meirCategory = new Set(records.filter((r) => (r.raw_categories || []).includes('מכון מאיר')).map((r) => r.source_page_id));

function sourceOf(item) {
  if (/^Meir:/.test(item.video_id || '') || meirCategory.has(item.source_page_id)) return 'machon-meir';
  if (/^שו"ת סמס/.test(item.title)) return 'shut-sms';
  return COLLECTION_SOURCE[item.source_collection] || null;
}

async function fetchAll(table, columns) {
  const rows = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase.from(table).select(columns).order('id').range(from, from + 999);
    if (error) throw new Error(`${table}: ${error.message}`);
    rows.push(...data);
    if (data.length < 1000) return rows;
  }
}

const items = await fetchAll('content_items', 'id, title, video_id, source_collection, source_page_id, is_active');
const plan = items.map((i) => ({ id: i.id, slug: sourceOf(i), active: i.is_active, collection: i.source_collection }));
const counts = {};
for (const p of plan) if (p.slug) counts[p.slug] = (counts[p.slug] || 0) + (p.active ? 1 : 0);
console.log(`${APPLY ? 'APPLY' : 'dry run'} | items: ${items.length} | active items per source:`, counts);
const overlaps = plan.filter((p) => p.slug && p.collection && COLLECTION_SOURCE[p.collection] && COLLECTION_SOURCE[p.collection] !== p.slug);
console.log(`items whose collection says otherwise (rule order decided): ${overlaps.length}`,
  Object.entries(overlaps.reduce((m, p) => ((m[`${p.collection} -> ${p.slug}`] = (m[`${p.collection} -> ${p.slug}`] || 0) + 1), m), {})));
if (!APPLY) { console.log('\nDry run only. Re-run with --apply to write (needs migration 004).'); process.exit(0); }

const { data: sources, error } = await supabase.from('sources').select('id, slug');
if (error) throw new Error(`sources: ${error.message} (run supabase/migrations/004_library.sql first)`);
const idBySlug = new Map(sources.map((s) => [s.slug, s.id]));
const current = await fetchAll('content_items', 'id, source_id');
const backupDir = 'support/derived/backup';
fs.mkdirSync(backupDir, { recursive: true });
const backupFile = path.join(backupDir, `sources-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
fs.writeFileSync(backupFile, JSON.stringify(current));
console.log(`backup: ${backupFile}`);

const currentById = new Map(current.map((c) => [c.id, c.source_id]));
const byTarget = new Map(); // source_id (or null) -> ids that need it
for (const p of plan) {
  const target = p.slug ? idBySlug.get(p.slug) : null;
  if (p.slug && !target) throw new Error(`unknown source slug ${p.slug}`);
  if ((currentById.get(p.id) ?? null) === target) continue;
  if (!byTarget.has(target)) byTarget.set(target, []);
  byTarget.get(target).push(p.id);
}
let updated = 0;
for (const [target, ids] of byTarget) {
  for (let i = 0; i < ids.length; i += 500) {
    const { error: e } = await supabase.from('content_items').update({ source_id: target }).in('id', ids.slice(i, i + 500));
    if (e) throw new Error(`update: ${e.message}`);
    updated += ids.slice(i, i + 500).length;
  }
}
console.log(`updated ${updated} items. Next: npm run revalidate`);
