// Resolves Machon Meir lesson ids to their Vimeo video ids once, offline, into
// lib/meir-vimeo.json. The site used to scrape meirtv.com on every page view, which fails
// from Vercel's servers (the page then fell back to embedding the whole meirtv.com page,
// with its cookie banner and ads). Re-run after importing new Meir videos:
//   node scripts/build-meir-vimeo-map.mjs            (only ids not in the map yet)
//   node scripts/build-meir-vimeo-map.mjs --all      (re-check everything)
import fs from 'fs';
import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config({ path: '.env.local', quiet: true });
const FILE = 'lib/meir-vimeo.json';
const ALL = process.argv.includes('--all');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const rows = [];
for (let from = 0; ; from += 1000) {
  const { data, error } = await supabase
    .from('content_items')
    .select('video_id, content_md')
    .eq('is_active', true)
    .or('video_id.like.Meir:%,content_md.ilike.%machonMeeir%')
    .range(from, from + 999);
  if (error) throw error;
  rows.push(...data);
  if (data.length < 1000) break;
}

const ids = new Set();
for (const r of rows) {
  if (r.video_id?.startsWith('Meir:')) ids.add(r.video_id.replace('Meir:', '').split('&')[0]);
  for (const m of String(r.content_md || '').matchAll(/<machonMeeir\w*>(\d+)/gi)) ids.add(m[1]);
}

const map = fs.existsSync(FILE) ? JSON.parse(fs.readFileSync(FILE, 'utf8')) : {};
const todo = [...ids].filter((id) => ALL || !(id in map)).sort((a, b) => a - b);
console.log(`Meir ids in use: ${ids.size} | to check: ${todo.length}`);

let found = 0;
for (const [i, id] of todo.entries()) {
  try {
    const res = await fetch(`https://meirtv.com/shiurim/shiur-${id}/`, { signal: AbortSignal.timeout(20000) });
    const vimeo = (await res.text()).match(/player\.vimeo\.com\/video\/(\d+)/)?.[1] ?? null;
    map[id] = vimeo; // null = checked, no video (the item is shown as a link card)
    if (vimeo) found++;
  } catch (err) {
    console.error(`  ${id}: ${err.message} (will retry next run)`);
  }
  if ((i + 1) % 50 === 0) console.log(`  ${i + 1}/${todo.length}`);
  await new Promise((r) => setTimeout(r, 500)); // be gentle with meirtv.com
}

const sorted = Object.fromEntries(Object.entries(map).sort(([a], [b]) => a - b));
fs.writeFileSync(FILE, JSON.stringify(sorted, null, 0));
const withVideo = Object.values(sorted).filter(Boolean).length;
console.log(`checked now: ${todo.length} (found ${found}) | map: ${Object.keys(sorted).length} ids, ${withVideo} with a Vimeo video`);
