// Renames a curated filter node and its descendants IN PLACE (same ids), e.g. a core topic:
//   node scripts/source/rename-filter-node.mjs "מועדים" "חגים ומועדים"           dry run
//   node scripts/source/rename-filter-node.mjs "מועדים" "חגים ומועדים" --apply   backup, then write
// Why: apply-topic-taxonomy.mjs upserts nodes by path, so renaming only in the mapping would
// create new nodes (new ids) and delete the old ones, breaking ?topic=<id> links. Run this
// first, after renaming the node in draft-topic-taxonomy.mjs (and regenerating the mapping),
// then apply-topic-taxonomy.mjs --apply. Old /topics/<old path> URLs need a redirect in
// next.config.ts.
import fs from 'fs';
import path from 'path';
import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config({ path: '.env.local', quiet: true });
const [from, to] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const APPLY = process.argv.includes('--apply');
if (!from || !to) throw new Error('usage: rename-filter-node.mjs "<old path>" "<new path>" [--apply]');
const SEP = ' › ';
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const { data: nodes, error } = await supabase.from('filter_nodes').select('id, path, name').or(`path.eq.${JSON.stringify(from)},path.like.${JSON.stringify(from + SEP + '%')}`);
if (error) throw error;
if (!nodes.length) throw new Error(`no node "${from}"`);
const { data: clash } = await supabase.from('filter_nodes').select('id, path').eq('path', to);
if (clash?.length) throw new Error(`"${to}" already exists (id ${clash[0].id})`);

const updates = nodes.map((n) => {
  const newPath = to + n.path.slice(from.length);
  return { id: n.id, path: newPath, name: newPath.split(SEP).pop(), old: n.path };
});
console.log(`${APPLY ? 'APPLY' : 'dry run'}: ${updates.length} nodes`);
for (const u of updates.slice(0, 5)) console.log(`  ${u.id}  ${u.old}  ->  ${u.path}`);
if (!APPLY) { console.log('\nDry run only. Re-run with --apply to write.'); process.exit(0); }

const backupDir = 'support/derived/backup';
fs.mkdirSync(backupDir, { recursive: true });
const backupFile = path.join(backupDir, `filter-nodes-rename-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
fs.writeFileSync(backupFile, JSON.stringify(nodes));
console.log(`backup: ${backupFile}`);
for (const u of updates) {
  const { error: e } = await supabase.from('filter_nodes').update({ path: u.path, name: u.name }).eq('id', u.id);
  if (e) throw new Error(`${u.id}: ${e.message}`);
}
console.log(`renamed ${updates.length} nodes. Next: node scripts/source/apply-topic-taxonomy.mjs --apply`);
