// Builds lib/legacy-redirects.json: every legacy MediaWiki title and page id (curid) ->
// its path on the new site, for the 301 redirects in app/[...legacy]/route.ts.
// Usage: npx tsx scripts/source/build-legacy-redirects.ts
// Needs support/derived/xml_pages.json (extract-mediawiki-xml.mjs) and .env.local.
import fs from 'fs';
import path from 'path';
import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { legacyTitleKey } from '../../lib/legacy-title';
import type { LegacyRedirects } from '../../lib/legacy';

config({ path: '.env.local', quiet: true });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false },
});

interface XmlPage { id: number; ns: number; title: string; redirect: string | null }
const xml: XmlPage[] = JSON.parse(fs.readFileSync('support/derived/xml_pages.json', 'utf8'));

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], cell = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(cell); rows.push(row); row = []; cell = '';
    } else cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.some(Boolean));
}

async function fetchAll<T>(table: string, columns: string): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase.from(table).select(columns).order('id').range(from, from + 999);
    if (error) throw new Error(`${table}: ${error.message}`);
    rows.push(...(data as T[]));
    if (data.length < 1000) return rows;
  }
}

async function main() {
const [items, topics, series] = await Promise.all([
  fetchAll<{ id: number; source_page_id: number | null; is_active: boolean }>('content_items', 'id, source_page_id, is_active'),
  fetchAll<{ id: number; name: string }>('topics', 'id, name'),
  fetchAll<{ id: number; name: string }>('series', 'id, name'),
]);

// ---------------------------------------------------------------- page -> new path
const contentBySourceId = new Map(items.filter((i) => i.source_page_id && i.is_active).map((i) => [i.source_page_id!, `/content/${i.id}`]));
const seriesByName = new Map(series.map((s) => [s.name, `/series/${s.id}`]));

// Source topic -> curated node page, from the editable mapping (docs/topic-taxonomy-mapping.csv).
const NODE_KINDS = new Set(['נושא סינון', 'מקופל', 'מקופל (מועמד לתת-נושא)', 'תגית', 'פרשת השבוע', 'כפילות/שגיאת כתיב', 'נתיב משורשר']);
const nodeHref = (p: string) => '/topics/' + p.split(' › ').map(encodeURIComponent).join('/');
const topicByName = new Map<string, string>();
for (const [name, , kind, target] of parseCsv(fs.readFileSync('docs/topic-taxonomy-mapping.csv', 'utf8').replace(/^﻿/, '')).slice(1)) {
  if (kind === 'סדרה/ספר' && seriesByName.has(target)) topicByName.set(name, seriesByName.get(target)!);
  // A target may name two nodes ("path | path"); the old category page goes to the first.
  else if (NODE_KINDS.has(kind) && target && !target.startsWith('(') && !target.startsWith('→') && !target.includes(':')) topicByName.set(name, nodeHref(target.split(' | ')[0]));
}

// Old numeric topic pages (/topics/<topics.id>, before the curated tree) -> the new page.
const topicRedirects: Record<string, string> = {};
for (const t of topics) topicRedirects[String(t.id)] = topicByName.get(t.name) ?? '/topics';
fs.writeFileSync(path.join('lib', 'topic-redirects.json'), JSON.stringify(topicRedirects));
console.log(`topic-redirects: ${topics.length} old topic ids (${Object.values(topicRedirects).filter((v) => v !== '/topics').length} to a specific node)`);

// Same category -> topic rules as build-taxonomy.mjs.
const HUB_CATEGORIES: Record<string, string> = {
  'וידאו': '/videos', 'סרטונים': '/videos', 'וידאו קצר': '/videos', 'וידאו ארוך': '/videos',
  'מאמר': '/articles', 'מאמרים': '/articles',
  'שו"ת': '/qa', 'שו"תים': '/qa', 'שו"ת לפי נושא': '/qa',
  'סדרות': '/series', 'שיעורי הרב אבינר בצרפתית': '/french',
};
const TOPIC_ALIASES: Record<string, string> = { 'חגים': 'מועדים' };
const SUFFIX = /\s*\((וידאו|מאמרים|מאמר|שו"ת|שו"תים|סדרות|סדרת וידאו)\)+$/;

function categoryPath(name: string): string | undefined {
  if (HUB_CATEGORIES[name]) return HUB_CATEGORIES[name];
  const stripped = name.replace(SUFFIX, '').trim();
  // The mapping decides first (series-kind rows already map to their series page); a series
  // of the same name only as a fallback — "שמירת הלשון (מאמרים)" is a topic, not the video series.
  return topicByName.get(TOPIC_ALIASES[stripped] || stripped) ?? topicByName.get(name) ?? seriesByName.get(stripped) ?? seriesByName.get(name);
}

// The old home page ("עמוד ראשי") redirects to "(הרב) אבינרפדיה- ..." index pages.
const isHomePage = (title: string) => title === 'עמוד ראשי' || title.startsWith('(הרב) אבינרפדיה');

function directPath(page: XmlPage): string | undefined {
  if (page.ns === 0) return isHomePage(page.title) ? '/' : contentBySourceId.get(page.id);
  if (page.ns === 14) return categoryPath(page.title.replace(/^[^:]+:/, '').trim());
  return undefined;
}

// ---------------------------------------------------------------- resolve redirects
const byKey = new Map(xml.map((p) => [legacyTitleKey(p.title), p]));

/** Follows redirect chains; returns the final page or the missing target title. */
function follow(page: XmlPage): { page?: XmlPage; missing?: string } {
  const seen = new Set<number>();
  let current = page;
  while (current.redirect) {
    if (seen.has(current.id)) return {};
    seen.add(current.id);
    const next = byKey.get(legacyTitleKey(current.redirect));
    if (!next) return { missing: current.redirect.replace(/#.*$/, '') };
    current = next;
  }
  return { page: current };
}

const out: LegacyRedirects = { titles: {}, curids: {}, searches: {} };
const stats = { direct: 0, viaRedirect: 0, redirectToMissing: 0, unmapped: 0, home: 0 };
const unmappedSample: string[] = [];

for (const page of xml) {
  if (page.ns !== 0 && page.ns !== 14) continue;
  const key = legacyTitleKey(page.title);
  const home = page.ns === 0 && isHomePage(page.title);
  // A page's own mapping wins over its redirect (e.g. the French category page is a
  // redirect, but its name maps straight to /french).
  const own = directPath(page);
  const { page: final, missing } = home || own ? { page, missing: undefined } : follow(page);
  const target = own ?? (final ? directPath(final) : undefined);

  if (target) {
    out.titles[key] = target;
    out.curids[String(page.id)] = target;
    if (home) stats.home++;
    else if (page.redirect) stats.viaRedirect++;
    else stats.direct++;
  } else if (missing) {
    out.searches[key] = legacyTitleKey(missing);
    stats.redirectToMissing++;
  } else {
    stats.unmapped++;
    if (unmappedSample.length < 8) unmappedSample.push(page.title);
  }
}

const file = path.join('lib', 'legacy-redirects.json');
fs.writeFileSync(file, JSON.stringify(out));
console.log(stats);
console.log(`titles: ${Object.keys(out.titles).length} | curids: ${Object.keys(out.curids).length} | searches: ${Object.keys(out.searches).length}`);
console.log(`wrote ${file} (${(fs.statSync(file).size / 1024).toFixed(0)} KB)`);
console.log('unmapped sample (served as search fallback):', unmappedSample);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
