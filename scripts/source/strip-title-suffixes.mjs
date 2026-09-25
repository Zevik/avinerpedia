// Removes the source wiki's type suffixes from stored titles: "(מאמר)", "(וידאו)", "(שו"ת)".
//   node scripts/source/strip-title-suffixes.mjs           dry run: counts and conflicts
//   node scripts/source/strip-title-suffixes.mjs --apply   backup, then write
// content_items.title is unique, so:
//   - an active item whose clean title belongs to a HIDDEN item (usually a wiki redirect alias)
//     gets the clean title, and the hidden one becomes "<title> [#<id>]";
//   - two ACTIVE items that would end up with the same title (e.g. an article and a video of the
//     same name) are left as they are and listed, for a person to decide.
// Redirects from old wiki URLs are built from source page ids, not titles, so they still work.
// Re-importing with import-from-wiki.ts (upserts on title) would now create duplicates.
import fs from 'fs';
import path from 'path';
import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config({ path: '.env.local', quiet: true });
const APPLY = process.argv.includes('--apply');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

/** "X (מאמר)", "X(וידאו)", "X (שו"ת)" (any quote form), a stray ")" after it. Other parentheses stay. */
export const SUFFIX = /\s*\((?:מאמר|וידאו|שו(?:"|״|'')ת)\)\)?/g;
const clean = (t) => t.replace(SUFFIX, '').replace(/\s{2,}/g, ' ').trim();

const rows = [];
for (let from = 0; ; from += 1000) {
  const { data, error } = await supabase.from('content_items').select('id, title, is_active').order('id').range(from, from + 999);
  if (error) throw error;
  rows.push(...data);
  if (data.length < 1000) break;
}
const byTitle = new Map(rows.map((r) => [r.title, r]));
const candidates = rows.filter((r) => SUFFIX.test(r.title) && (SUFFIX.lastIndex = 0, true)).map((r) => ({ ...r, clean: clean(r.title) }))
  .filter((r) => r.clean && r.clean !== r.title);

// Several items cleaning to the same title: keep the active one if exactly one is active.
const groups = new Map();
for (const c of candidates) groups.set(c.clean, [...(groups.get(c.clean) || []), c]);

const renames = []; // { id, from, to }
const hiddenMoves = []; // hidden items that give up their title
const conflicts = []; // left as they are
for (const [target, group] of groups) {
  const active = group.filter((g) => g.is_active);
  const winner = group.length === 1 ? group[0] : active.length === 1 ? active[0] : null;
  if (!winner) { conflicts.push({ target, items: group.map((g) => `${g.id}${g.is_active ? '' : ' (מוסתר)'}: ${g.title}`) }); continue; }
  for (const loser of group.filter((g) => g !== winner)) if (!loser.is_active) hiddenMoves.push(loser);
  const holder = byTitle.get(target);
  if (holder && !candidates.some((c) => c.id === holder.id)) {
    if (holder.is_active && winner.is_active) { conflicts.push({ target, items: [`${holder.id}: ${holder.title}`, `${winner.id}: ${winner.title}`] }); continue; }
    if (holder.is_active) continue; // the clean title belongs to an active item; a hidden one keeps its suffix
    hiddenMoves.push(holder);
  }
  renames.push({ id: winner.id, from: winner.title, to: target });
}

console.log(`${APPLY ? 'APPLY' : 'dry run'} | titles with a suffix: ${candidates.length} | to rename: ${renames.length} | hidden items giving up a title: ${hiddenMoves.length} | left for review: ${conflicts.length}`);
console.log('examples:', renames.slice(0, 5).map((r) => `${r.from} -> ${r.to}`).join(' | '));
if (conflicts.length) {
  console.log('\nleft as they are (two active items would share a title):');
  for (const c of conflicts) console.log(`  "${c.target}": ${c.items.join(' / ')}`);
}
if (!APPLY) { console.log('\nDry run only. Re-run with --apply to write.'); process.exit(0); }

const backupDir = 'support/derived/backup';
fs.mkdirSync(backupDir, { recursive: true });
const backupFile = path.join(backupDir, `titles-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
fs.writeFileSync(backupFile, JSON.stringify(rows.map(({ id, title }) => ({ id, title }))));
console.log(`backup: ${backupFile}`);

// Hidden holders first (frees the titles), then the renames.
for (const h of hiddenMoves) {
  const { error } = await supabase.from('content_items').update({ title: `${h.title} [#${h.id}]` }).eq('id', h.id);
  if (error) throw new Error(`hidden ${h.id}: ${error.message}`);
}
let failed = 0;
for (let i = 0; i < renames.length; i += 10) {
  await Promise.all(renames.slice(i, i + 10).map(async (r) => {
    const { error } = await supabase.from('content_items').update({ title: r.to }).eq('id', r.id);
    if (error) { failed++; console.error(r.id, r.from, error.message); }
  }));
}
console.log(`renamed ${renames.length - failed} | failed ${failed} | hidden items renamed ${hiddenMoves.length}. Next: npm run revalidate`);
