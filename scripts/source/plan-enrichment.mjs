// Read-only: matches taxonomy.json to Supabase content_items and writes the planned changes.
// Usage: node scripts/source/plan-enrichment.mjs [derivedDir]
// Output: <derivedDir>/enrichment-plan.json  (+ a summary on stdout)
import fs from 'fs';
import path from 'path';
import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config({ path: '.env.local' });
const DIR = process.argv[2] || 'support/derived';
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

// Current site categories for each content type.
export const MAIN_CATEGORY = {
  video: 'סרטונים',
  article: 'מאמרים',
  qa: 'שו"ת הלכה',
  series: 'סדרות',
  french: 'Cours en Français',
};

// Title key that survives the MDX export (which dropped "/" and "\" from titles) and entity/quote noise.
export const titleKey = (t) =>
  String(t)
    .replace(/&quot;|''/g, '"')
    .replace(/[^\p{L}\p{N}]/gu, '')
    .toLowerCase();

async function fetchAll() {
  const rows = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from('content_items')
      .select('id, title, main_category, sub_category, video_id, publish_date, is_active')
      .order('id')
      .range(from, from + 999);
    if (error) throw error;
    rows.push(...data);
    if (data.length < 1000) return rows;
  }
}

const { records } = JSON.parse(fs.readFileSync(path.join(DIR, 'taxonomy.json'), 'utf8'));
const items = await fetchAll();

// Match on the exact title first; fall back to the loose key only when it is unambiguous,
// since the loose key merges distinct pages like "L'éthique de l'amour 2" and "...amour2".
const exactTitle = (t) => String(t).replace(/&quot;|''/g, '"').replace(/\s+/g, ' ').trim();
const byExact = new Map(records.map((r) => [exactTitle(r.title), r]));
const byKey = new Map();
for (const r of records) {
  const k = titleKey(r.title);
  byKey.set(k, byKey.has(k) ? null : r); // null = ambiguous
}

// Source redirects: DB items that are aliases of another page.
const xmlPages = JSON.parse(fs.readFileSync(path.join(DIR, 'xml_pages.json'), 'utf8'));
const redirectKeys = new Set(xmlPages.filter((p) => p.ns === 0 && p.redirect).map((p) => titleKey(p.title)));

const plan = [];
const unmatchedItems = [];
const matchedSourceIds = new Set();
const takenByExact = new Set(items.map((i) => byExact.get(exactTitle(i.title))?.source_page_id).filter(Boolean));
for (const item of items) {
  let src = byExact.get(exactTitle(item.title));
  if (!src) {
    const loose = byKey.get(titleKey(item.title));
    if (loose && !takenByExact.has(loose.source_page_id)) src = loose;
  }
  if (!src) {
    const isRedirect = redirectKeys.has(titleKey(item.title));
    unmatchedItems.push({ ...item, isRedirect });
    if (isRedirect && item.is_active) {
      plan.push({ id: item.id, title: item.title, source_page_id: null, before: item, changes: { is_active: false }, reason: 'source redirect' });
    }
    continue;
  }
  matchedSourceIds.add(src.source_page_id);
  const next = {
    main_category: MAIN_CATEGORY[src.content_type],
    sub_category: src.series || src.primary_topic || item.sub_category,
    video_id: item.video_id || src.video_id,
    publish_date: item.publish_date || src.publish_date,
  };
  // Items with an empty body were deactivated on import; a video found in the source revives them.
  if (!item.is_active && next.video_id) next.is_active = true;
  const changes = Object.fromEntries(Object.entries(next).filter(([k, v]) => (v ?? null) !== (item[k] ?? null)));
  plan.push({ id: item.id, title: item.title, source_page_id: src.source_page_id, before: item, changes });
}
const missingInDb = records.filter((r) => !matchedSourceIds.has(r.source_page_id));

fs.writeFileSync(
  path.join(DIR, 'enrichment-plan.json'),
  JSON.stringify({ plan, unmatchedItems, missingInDb: missingInDb.map((r) => ({ source_page_id: r.source_page_id, title: r.title, content_type: r.content_type })) }, null, 1),
);

const count = (arr, f) => arr.reduce((m, x) => ((m[f(x)] = (m[f(x)] || 0) + 1), m), {});
const changed = plan.filter((p) => Object.keys(p.changes).length);
console.log(`content_items: ${items.length} | matched: ${plan.length} | unmatched: ${unmatchedItems.length} | source pages not in DB: ${missingInDb.length}`);
console.log(`items that would change: ${changed.length}`);
for (const field of ['main_category', 'sub_category', 'video_id', 'publish_date']) {
  console.log(`  ${field}: ${changed.filter((p) => field in p.changes).length}`);
}
const moves = count(changed.filter((p) => p.changes.main_category), (p) => `${p.before.main_category} -> ${p.changes.main_category}`);
console.log('main_category moves:', Object.entries(moves).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}: ${v}`).join(' | '));
console.log('unmatched item sample:', unmatchedItems.slice(0, 8).map((i) => i.title));
console.log('unmatched: redirects', unmatchedItems.filter((i) => i.isRedirect).length, '| other', unmatchedItems.filter((i) => !i.isRedirect).length);
