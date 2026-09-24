// Applies the curated filter tree (docs/TOPIC_TAXONOMY_DRAFT.md) to Supabase.
//   node scripts/source/apply-topic-taxonomy.mjs            dry run: coverage report
//   node scripts/source/apply-topic-taxonomy.mjs --apply    backup, then write
// Inputs: docs/topic-taxonomy-mapping.csv (source topic -> node; the editable source of
// truth), docs/topic-taxonomy-tree.json (node order, series and parasha rules),
// support/derived/taxonomy.json (each source page's topics). Needs migration 003.
import fs from 'fs';
import path from 'path';
import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { parseCsv } from './csv.mjs';
import { writeFilterCounts } from './filter-counts.mjs';

config({ path: '.env.local', quiet: true });
const APPLY = process.argv.includes('--apply');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});
const SEP = ' › ';

// ---------------------------------------------------------------- inputs
const tree = JSON.parse(fs.readFileSync('docs/topic-taxonomy-tree.json', 'utf8'));
const { records, topics } = JSON.parse(fs.readFileSync('support/derived/taxonomy.json', 'utf8'));
const topicParents = new Map(topics.map((t) => [t.name, t.parents]));

const [, ...csvRows] = parseCsv(fs.readFileSync('docs/topic-taxonomy-mapping.csv', 'utf8'));
// source topic -> { kind, target }
const mapping = new Map(csvRows.map(([name, , kind, target]) => [name, { kind, target }]));

const NODE_KINDS = new Set(['נושא סינון', 'מקופל', 'מקופל (מועמד לתת-נושא)', 'תגית', 'פרשת השבוע', 'כפילות/שגיאת כתיב', 'נתיב משורשר']);
const isNodePath = (t) => t && !t.startsWith('(') && !t.startsWith('→') && !t.includes(':');

// ---------------------------------------------------------------- node set
// Curated order first; any other valid target path (e.g. a "הלכות X" level) after it.
const nodePaths = [...tree.treePaths];
const known = new Set(nodePaths);
for (const { kind, target } of mapping.values()) {
  if (!NODE_KINDS.has(kind) || !isNodePath(target)) continue;
  const parts = target.split(SEP);
  for (let i = 1; i <= parts.length; i++) {
    const p = parts.slice(0, i).join(SEP);
    if (!known.has(p)) { known.add(p); nodePaths.push(p); }
  }
}

// ---------------------------------------------------------------- per-item classification
const chumashOf = new Map(Object.entries(tree.chumash).flatMap(([c, ps]) => ps.map((p) => [p, c])));
const parashaWords = [...chumashOf.keys()].sort((a, b) => b.length - a.length);
const seriesRules = tree.seriesNodes.map(([re, node]) => [new RegExp(re), node]);

// Title keyword fallback: node names and the source topics mapped to them, longest first.
const keywordIndex = [];
for (const [name, { kind, target }] of mapping) {
  if (!['נושא סינון', 'כפילות/שגיאת כתיב'].includes(kind) || !isNodePath(target) || name.length < 3) continue;
  keywordIndex.push([name, target]);
}
for (const p of nodePaths) {
  const last = p.split(SEP).pop();
  // Parasha names are ordinary words ("בלק", "תרומה"); they only count via the strict rule.
  if (p.includes(`${SEP}פרשת השבוע${SEP}`)) continue;
  if (last.length >= 3 && !/^הלכות /.test(last)) keywordIndex.push([last, p]);
}
keywordIndex.sort((a, b) => b[0].length - a[0].length);
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const wordRe = (w) => new RegExp(`(^|[\\s,.:;"'׳״()\\-])${escapeRe(w)}($|[\\s,.:;"'׳״()\\-?!])`);
const keywordRes = keywordIndex.map(([w, p]) => [wordRe(w), p]);

function titleNodes(title) {
  // "פרשת נח - ..." or a parasha name with a year ("בחוקותי ע"ה - ...") -> the parasha.
  // A bare word is not enough: "תרומה באמצעות העברה בנקאית" is a donation, not the parasha.
  const par = parashaWords.find((p) =>
    new RegExp(`^(פרשת\\s+${escapeRe(p)}([\\s,:\\-]|$)|${escapeRe(p)}\\s+(ע"[א-ת]|תש"?[א-ת]))`).test(title));
  if (par) return [`תורה ולימוד${SEP}פרשת השבוע${SEP}${chumashOf.get(par)}${SEP}${par}`];
  const hit = keywordRes.find(([re]) => re.test(title));
  return hit ? [hit[1]] : [];
}

const SA = new Set(tree.shulchanAruch);
function saSection(topicNames) {
  const seen = new Set();
  const stack = [...topicNames];
  while (stack.length) {
    const t = stack.pop();
    if (seen.has(t)) continue;
    seen.add(t);
    if (SA.has(t)) return t;
    stack.push(...(topicParents.get(t) || []));
  }
  return null;
}

const stats = { fromTopics: 0, fromSeries: 0, fromTitle: 0, qaFallback: 0, none: 0 };
const titleSamples = []; // shown with --show-title, to review the keyword fallback
const classified = new Map(); // source_page_id -> { nodes:Set, primary, sa, source }
for (const r of records) {
  const nodes = new Set();
  const tags = []; // specific-question topics: shown as tags, not filters
  let source = null;
  for (const t of r.topics) {
    const m = mapping.get(t);
    if (!m) continue;
    if (m.kind === 'תגית') tags.push(t);
    if (NODE_KINDS.has(m.kind) && isNodePath(m.target)) nodes.add(m.target);
    if (m.kind === 'אוסף/מכל' && m.target.startsWith('מקור: ')) source ??= m.target.slice('מקור: '.length);
  }
  let how = nodes.size ? 'fromTopics' : null;
  if (r.series) {
    const rule = seriesRules.find(([re]) => re.test(r.series));
    if (rule) { nodes.add(rule[1]); how ??= 'fromSeries'; }
  }
  if (!nodes.size) for (const n of titleNodes(r.title)) { nodes.add(n); how = 'fromTitle'; titleSamples.push(`${r.title}  =>  ${n}`); }
  if (!nodes.size && r.content_type === 'qa') { nodes.add('הלכה'); how = 'qaFallback'; }
  stats[how || 'none']++;

  // Primary: the node of the page's most specific source topic, else the deepest node.
  const primaryTopic = r.primary_topic && mapping.get(r.primary_topic);
  const primary = primaryTopic && isNodePath(primaryTopic.target) && nodes.has(primaryTopic.target)
    ? primaryTopic.target
    : [...nodes].sort((a, b) => b.split(SEP).length - a.split(SEP).length)[0] || null;

  classified.set(r.source_page_id, { nodes, primary, sa: saSection(r.topics), source, tags });
}

const withAncestors = (paths) => {
  const all = new Set();
  for (const p of paths) {
    const parts = p.split(SEP);
    for (let i = 1; i <= parts.length; i++) all.add(parts.slice(0, i).join(SEP));
  }
  return all;
};

console.log(`mode: ${APPLY ? 'APPLY' : 'dry run'} | nodes: ${nodePaths.length} | source pages: ${records.length}`);
console.log('how items got their nodes:', stats);
const coreCounts = {};
for (const c of classified.values()) for (const p of withAncestors(c.nodes)) if (!p.includes(SEP)) coreCounts[p] = (coreCounts[p] || 0) + 1;
console.log('items per core topic:', coreCounts);
console.log('with sa_section:', [...classified.values()].filter((c) => c.sa).length,
  '| with source_collection:', [...classified.values()].filter((c) => c.source).length);

if (!APPLY) {
  const none = records.filter((r) => !classified.get(r.source_page_id).nodes.size);
  console.log('\nno node, by type:', none.reduce((m, r) => ((m[r.content_type] = (m[r.content_type] || 0) + 1), m), {}));
  console.log('sample:', none.slice(0, 12).map((r) => r.title).join(' | '));
  if (process.argv.includes('--show-title')) console.log(`\nclassified by title (${titleSamples.length}):\n${titleSamples.join('\n')}`);
  console.log('\nDry run only. Re-run with --apply to write.');
  process.exit(0);
}

// ---------------------------------------------------------------- write
async function check(label, promise) {
  const { data, error } = await promise;
  if (error) throw new Error(`${label}: ${error.message}`);
  return data;
}
async function fetchAll(table, columns) {
  const rows = [];
  for (let from = 0; ; from += 1000) {
    const data = await check(table, supabase.from(table).select(columns).order('id').range(from, from + 999));
    rows.push(...data);
    if (data.length < 1000) return rows;
  }
}

const items = await fetchAll('content_items', 'id, source_page_id, sub_category, primary_node_id, sa_section, source_collection, original_tags');
const backupDir = 'support/derived/backup';
fs.mkdirSync(backupDir, { recursive: true });
const backupFile = path.join(backupDir, `filter-tree-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
fs.writeFileSync(backupFile, JSON.stringify(items));
console.log(`backup: ${backupFile}`);

// Nodes, parents first so parent ids exist.
const idByPath = new Map();
const siblings = new Map();
for (const p of nodePaths) {
  const parts = p.split(SEP);
  const parentPath = parts.slice(0, -1).join(SEP);
  const order = (siblings.get(parentPath) || 0) + 1;
  siblings.set(parentPath, order);
  const row = { path: p, name: parts.at(-1), depth: parts.length - 1, sort_order: order, parent_id: parentPath ? idByPath.get(parentPath) : null };
  const [saved] = await check(`node ${p}`, supabase.from('filter_nodes').upsert(row, { onConflict: 'path' }).select('id'));
  idByPath.set(p, saved.id);
}
console.log(`filter_nodes: ${idByPath.size}`);

// Item links (replace all), plus per-item columns.
const links = [];
const updates = [];
for (const item of items) {
  const c = item.source_page_id && classified.get(item.source_page_id);
  const nodes = c ? withAncestors(c.nodes) : new Set();
  for (const p of nodes) links.push({ content_id: item.id, node_id: idByPath.get(p) });
  const primaryId = c?.primary ? idByPath.get(c.primary) : null;
  const change = {
    primary_node_id: primaryId ?? null,
    sa_section: c?.sa ?? null,
    source_collection: c?.source ?? null,
    original_tags: c?.tags.length ? c.tags.join(' | ') : null,
    // Cards show sub_category; use the curated leaf name instead of the raw topic.
    ...(c?.primary ? { sub_category: c.primary.split(SEP).pop() } : {}),
  };
  if (Object.entries(change).some(([k, v]) => (item[k] ?? null) !== v)) updates.push({ id: item.id, change });
}

await check('clear links', supabase.from('content_filter_nodes').delete().gt('node_id', 0));
for (let i = 0; i < links.length; i += 1000) {
  await check('links', supabase.from('content_filter_nodes').insert(links.slice(i, i + 1000)));
}
console.log(`content_filter_nodes: ${links.length}`);

let failed = 0;
for (let i = 0; i < updates.length; i += 8) {
  await Promise.all(updates.slice(i, i + 8).map(async (u) => {
    const { error } = await supabase.from('content_items').update(u.change).eq('id', u.id);
    if (error) { failed++; console.error(u.id, error.message); }
  }));
  if ((i / 8) % 100 === 0) process.stdout.write(`  ${Math.min(i + 8, updates.length)}/${updates.length}\n`);
}
console.log(`content_items updated: ${updates.length - failed} | failed: ${failed}`);

// Nodes that no longer occur (renamed/removed in the tree) are dropped.
const stale = (await fetchAll('filter_nodes', 'id, path')).filter((n) => !idByPath.has(n.path));
if (stale.length) await check('stale nodes', supabase.from('filter_nodes').delete().in('id', stale.map((n) => n.id)));

await writeFilterCounts(supabase);
console.log('\nThen run in the SQL Editor: select * from public.sync_content_categories();  (sub_category changed)');
