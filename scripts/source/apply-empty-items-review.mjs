// Applies docs/empty-items-review.csv: active items that showed no content to a visitor.
//   node scripts/source/apply-empty-items-review.mjs           dry run: what would change
//   node scripts/source/apply-empty-items-review.mjs --apply   backup, then write
// Actions (column "action", overridden by "decision" when set):
//   hide              is_active = false (hidden everywhere public, still in /admin)
//   fill_from_source  content_md + summary from the source wiki's current wikitext
//                     (support/derived/xml_pages.json), converted by wikitext-to-markdown.mjs
//   keep / ok         nothing ("ok" means "as proposed")
// Afterwards: npx tsx scripts/source/build-legacy-redirects.ts, commit lib/legacy-redirects.json,
// and npm run revalidate.
import fs from 'fs';
import path from 'path';
import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { parseCsv } from './csv.mjs';
import { writeFilterCounts } from './filter-counts.mjs';
import { wikitextToMarkdown, summaryFromMarkdown } from './wikitext-to-markdown.mjs';

config({ path: '.env.local', quiet: true });
const APPLY = process.argv.includes('--apply');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const [header, ...rows] = parseCsv(fs.readFileSync('docs/empty-items-review.csv', 'utf8'));
const col = Object.fromEntries(header.map((h, i) => [h, i]));
const plan = rows.map((r) => {
  const decision = (r[col.decision] || '').trim().toLowerCase();
  const action = !decision || decision === 'ok' ? r[col.action] : { fill: 'fill_from_source' }[decision] || decision;
  return { id: Number(r[col.id]), title: r[col.title], action };
});
const unknown = plan.filter((p) => !['hide', 'fill_from_source', 'keep'].includes(p.action));
if (unknown.length) throw new Error(`unknown actions: ${unknown.map((p) => `${p.id}=${p.action}`).join(', ')}`);

const { data: items, error } = await supabase
  .from('content_items')
  .select('id, title, is_active, content_md, summary, source_page_id')
  .in('id', plan.map((p) => p.id));
if (error) throw error;
const byId = new Map(items.map((i) => [i.id, i]));
const xml = JSON.parse(fs.readFileSync('support/derived/xml_pages.json', 'utf8'));
const sourceById = new Map(xml.map((p) => [p.id, p]));

const updates = [];
for (const p of plan) {
  const item = byId.get(p.id);
  if (!item) throw new Error(`item ${p.id} not found`);
  if (item.title !== p.title) throw new Error(`item ${p.id}: title changed ("${item.title}" vs "${p.title}")`);
  if (p.action === 'hide') {
    if (item.is_active) updates.push({ id: p.id, patch: { is_active: false }, note: `hide  ${p.title}` });
  } else if (p.action === 'fill_from_source') {
    const src = sourceById.get(item.source_page_id);
    if (!src?.text) throw new Error(`item ${p.id}: no source text`);
    const { markdown, unknownTemplates } = wikitextToMarkdown(src.text);
    if (unknownTemplates.length) throw new Error(`item ${p.id}: unknown templates ${unknownTemplates.join(', ')}`);
    const qa = (markdown.match(/^ש: /gm) || []).length;
    updates.push({
      id: p.id,
      patch: { content_md: markdown, summary: summaryFromMarkdown(markdown) },
      note: `fill  ${p.title}: ${item.content_md?.length ?? 0} -> ${markdown.length} chars${qa ? `, ${qa} Q&A` : ''}`,
    });
  }
}

console.log(`mode: ${APPLY ? 'APPLY' : 'dry run'} | rows: ${plan.length} | changes: ${updates.length}`);
for (const u of updates) console.log(`  ${u.id}  ${u.note}`);
if (!APPLY) {
  if (process.argv.includes('--show')) {
    const id = Number(process.argv[process.argv.indexOf('--show') + 1]);
    console.log(`\n--- ${id} ---\n${updates.find((u) => u.id === id)?.patch.content_md ?? '(no content change)'}`);
  }
  console.log('\nDry run only. Re-run with --apply to write.');
  process.exit(0);
}

const backupDir = 'support/derived/backup';
fs.mkdirSync(backupDir, { recursive: true });
const backupFile = path.join(backupDir, `empty-items-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
fs.writeFileSync(backupFile, JSON.stringify(items));
console.log(`backup: ${backupFile}`);

for (const u of updates) {
  const { error: e } = await supabase.from('content_items').update(u.patch).eq('id', u.id);
  if (e) throw new Error(`${u.id}: ${e.message}`);
}
console.log(`updated ${updates.length} items`);
await writeFilterCounts(supabase);
console.log('\nNext: npx tsx scripts/source/build-legacy-redirects.ts, commit lib/legacy-redirects.json, npm run revalidate');
