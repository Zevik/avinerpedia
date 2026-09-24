// Finds items whose YouTube video can't be played on the site and fixes or hides them.
//   node scripts/check-dead-videos.mjs            dry run: check videos, print the plan
//   node scripts/check-dead-videos.mjs --apply    backup to support/derived/backup/, then write
//
// A video is checked with YouTube's public oEmbed endpoint (no API key): 200 = playable,
// 401/403/404 = removed, private or not embeddable. Results are cached in
// support/derived/youtube-status.json so re-runs only check new ids (--recheck ignores the cache).
//
// For each active item whose video is dead:
//   - another playable YouTube id in its text or in the source wiki -> switch to it
//   - otherwise, real text left once embeds/boilerplate are removed -> drop the video, keep the text
//   - otherwise (nothing but a dead link) -> is_active = false (hidden, not deleted)
import fs from 'fs';
import path from 'path';
import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config({ path: '.env.local', quiet: true });
const APPLY = process.argv.includes('--apply');
const RECHECK = process.argv.includes('--recheck');
const DIR = 'support/derived';
const CACHE = path.join(DIR, 'youtube-status.json');
const MIN_TEXT = 80; // characters of real text needed to keep an item without its video

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const isYouTubeId = (v) => /^[A-Za-z0-9_-]{11}$/.test(v || '');
const youtubeIdsIn = (text) => [
  ...new Set(
    [...String(text || '').matchAll(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/|<youtube>\s*)([A-Za-z0-9_-]{11})/g)].map((m) => m[1]),
  ),
];

/** Text that remains once video embeds, links, markup and the lesson-date line are removed. */
function realText(md) {
  return String(md || '')
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, '')
    .replace(/<youtube>[\s\S]*?<\/youtube>/gi, '')
    .replace(/<machonMeeir\w*>[\s\S]*?<\/machonMeeir\w*>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/https?:\/\/\S+/g, '')
    .replace(/שיעור שהועבר בתאריך:.*$/gm, '')
    .replace(/•\s*למאגר מלא ומסודר[\s\S]*$/, '')
    .replace(/[#*_>\-\s]+/g, ' ')
    .trim();
}

async function fetchAll(columns) {
  const rows = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase.from('content_items').select(columns).order('id').range(from, from + 999);
    if (error) throw error;
    rows.push(...data);
    if (data.length < 1000) return rows;
  }
}

async function pool(items, size, fn) {
  let i = 0;
  let done = 0;
  await Promise.all(Array.from({ length: size }, async () => {
    while (i < items.length) {
      const item = items[i++];
      await fn(item);
      if (++done % 250 === 0) console.log(`  checked ${done}/${items.length}`);
    }
  }));
}

/** 'ok' | 'dead' | 'unknown' for one YouTube id. */
async function checkVideo(id) {
  const url = `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(`https://www.youtube.com/watch?v=${id}`)}`;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
      if (res.ok) return 'ok';
      if ([400, 401, 403, 404].includes(res.status)) return 'dead';
      if (res.status === 429) await new Promise((r) => setTimeout(r, 5000 * (attempt + 1)));
    } catch {
      await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
    }
  }
  return 'unknown';
}

// ---------------------------------------------------------------- gather
const items = (await fetchAll('id, title, video_id, content_md, is_active, source_page_id, main_category'))
  .filter((i) => i.is_active && isYouTubeId(i.video_id));

// Extra candidate ids from the source wiki (taxonomy.json), when available.
const sourceIds = new Map();
const taxonomyFile = path.join(DIR, 'taxonomy.json');
if (fs.existsSync(taxonomyFile)) {
  for (const r of JSON.parse(fs.readFileSync(taxonomyFile, 'utf8')).records) sourceIds.set(r.source_page_id, r.youtube_ids || []);
}

const candidates = (item) => [...new Set([item.video_id, ...youtubeIdsIn(item.content_md), ...(sourceIds.get(item.source_page_id) || [])])];

const cache = !RECHECK && fs.existsSync(CACHE) ? JSON.parse(fs.readFileSync(CACHE, 'utf8')) : {};
const toCheck = [...new Set(items.flatMap(candidates))].filter((id) => !cache[id] || cache[id] === 'unknown');
console.log(`active YouTube items: ${items.length} | ids to check: ${toCheck.length} (cached: ${Object.keys(cache).length})`);
await pool(toCheck, 6, async (id) => { cache[id] = await checkVideo(id); });
fs.mkdirSync(DIR, { recursive: true });
fs.writeFileSync(CACHE, JSON.stringify(cache, null, 1));

// ---------------------------------------------------------------- plan
const plan = { switchVideo: [], dropVideo: [], deactivate: [], unknown: [] };
for (const item of items) {
  const status = cache[item.video_id];
  if (status === 'ok') continue;
  if (status !== 'dead') { plan.unknown.push(item); continue; }
  const alternative = candidates(item).find((id) => id !== item.video_id && cache[id] === 'ok');
  if (alternative) plan.switchVideo.push({ item, change: { video_id: alternative } });
  else if (realText(item.content_md).length >= MIN_TEXT) {
    // The item now renders as text, so also remove embeds of its dead videos from the body.
    const dead = candidates(item).filter((id) => cache[id] === 'dead');
    const content_md = dead.reduce(
      (md, id) => md
        .replace(new RegExp(`<iframe[^>]*${id}[^>]*>\\s*</iframe>`, 'g'), '')
        .replace(new RegExp(`<youtube>\\s*${id}\\s*</youtube>`, 'g'), ''),
      item.content_md,
    );
    plan.dropVideo.push({ item, change: { video_id: null, content_md } });
  }
  else plan.deactivate.push({ item, change: { is_active: false } });
}

const statuses = Object.values(cache).reduce((m, s) => ((m[s] = (m[s] || 0) + 1), m), {});
console.log('video status:', statuses);
console.log(`dead video, switch to another playable video: ${plan.switchVideo.length}`);
console.log(`dead video, keep text and remove the player:  ${plan.dropVideo.length}`);
console.log(`dead video, nothing else -> hide (is_active=false): ${plan.deactivate.length}`);
console.log(`could not check (left unchanged):               ${plan.unknown.length}`);
for (const [label, list] of Object.entries(plan)) {
  if (label === 'unknown' || !list.length) continue;
  console.log(`\n${label} (sample):`);
  for (const { item } of list.slice(0, 5)) console.log(`  ${item.id} | ${item.title} | text: ${realText(item.content_md).length} chars`);
}
fs.writeFileSync(path.join(DIR, 'dead-videos-plan.json'), JSON.stringify(plan, null, 1));

if (!APPLY) {
  console.log('\nDry run only. Re-run with --apply to write. Plan: support/derived/dead-videos-plan.json');
  process.exit(0);
}

// ---------------------------------------------------------------- apply
const changes = [...plan.switchVideo, ...plan.dropVideo, ...plan.deactivate];
const backupDir = path.join(DIR, 'backup');
fs.mkdirSync(backupDir, { recursive: true });
const backupFile = path.join(backupDir, `dead-videos-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
fs.writeFileSync(backupFile, JSON.stringify(changes.map(({ item }) => ({ id: item.id, video_id: item.video_id, is_active: item.is_active, content_md: item.content_md }))));
console.log(`\nbackup: ${backupFile}`);

let failed = 0;
await pool(changes, 6, async ({ item, change }) => {
  const { error } = await supabase.from('content_items').update(change).eq('id', item.id);
  if (error) { failed++; console.error(item.id, error.message); }
});
console.log(`updated: ${changes.length - failed} | failed: ${failed}`);
