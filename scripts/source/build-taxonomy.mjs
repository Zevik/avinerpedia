// Builds a normalized taxonomy (content type, topics, series + order, video metadata) for every
// source page, from the JSON produced by extract-mediawiki-dump.mjs and extract-mediawiki-xml.mjs.
// Usage: node scripts/source/build-taxonomy.mjs [derivedDir]
// Output: <derivedDir>/taxonomy.json
import fs from 'fs';
import path from 'path';

const DIR = process.argv[2] || 'support/derived';
const read = (t) => JSON.parse(fs.readFileSync(path.join(DIR, `${t}.json`), 'utf8'));

// Some names are double-encoded (&amp;quot;), so decode until stable.
const decodeEntities = (s) => {
  for (let prev = null; prev !== s; ) {
    prev = s;
    s = s.replace(/&quot;/g, '"').replace(/&#0?39;|&#x27;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
  }
  return s;
};
/** Canonical raw category/page name: entities decoded, '' -> ", spaces -> underscores. */
const norm = (t) => decodeEntities(String(t)).replace(/''/g, '"').trim().replace(/\s+/g, '_');

const pages = read('page').map((p) => ({ ...p, page_title: norm(p.page_title) }));
const links = read('categorylinks').map((l) => ({ ...l, cl_to: norm(l.cl_to) }));
const cargoVideos = read('cargo__videos');
const cargoVideoCats = read('cargo__videos__categories');
const xmlPages = read('xml_pages');

const human = (t) => t.replace(/_/g, ' ').trim();

// ---------------------------------------------------------------- category roles
const TYPE_ROOTS = { 'וידאו': 'video', 'סרטונים': 'video', 'מאמר': 'article', 'מאמרים': 'article', 'שו"ת': 'qa', 'שו"תים': 'qa', 'סדרות': 'series' };
// Categories that describe format/quality/maintenance rather than subject.
const META = new Set([
  'וידאו קצר', 'וידאו ארוך', 'מכון מאיר', 'איכות שמע נמוכה', 'איכות וידאו נמוכה', 'קטגוריות מוסתרות',
  'סרטונים מיובאים', 'קטגוריה אוטומטית', 'מעלה', '(סדרות)',
  'שו"ת לפי נושא', // container for the Q&A topic tree
]);
// Duplicate topic trees on the source site, merged into one name.
const TOPIC_ALIASES = { 'חגים': 'מועדים' };
const FRENCH_ROOT = 'שיעורי הרב אבינר בצרפתית';
const SUFFIX = /\s*\((וידאו|מאמרים|מאמר|שו"ת|שו"תים|סדרות|סדרת וידאו)\)$/;
const SUFFIX_TYPE = { 'וידאו': 'video', 'סדרת וידאו': 'series', 'מאמרים': 'article', 'מאמר': 'article', 'שו"ת': 'qa', 'שו"תים': 'qa', 'סדרות': 'series' };

/** Topic name for a raw category, or null for type/meta categories. */
function topicOf(rawCat) {
  const name = human(rawCat);
  if (TYPE_ROOTS[name] || META.has(name) || name === FRENCH_ROOT) return null;
  const topic = name.replace(/\)\)+$/, ')').replace(SUFFIX, '').trim();
  return TOPIC_ALIASES[topic] || topic || null;
}

/** Categories written in wikitext, as raw (underscored) names. */
function wikitextCategories(text) {
  return [...decodeEntities(text).matchAll(/\[\[\s*(?:קטגוריה|Category)\s*:\s*([^\]|]+?)\s*(?:\|[^\]]*)?\]\]/gi)]
    .map((m) => norm(m[1]));
}

// ---------------------------------------------------------------- category graph
// categorylinks is stale for pages bot-edited in March 2026 (the job queue never ran),
// so parents come from both categorylinks and the latest wikitext of each category page.
const pageById = new Map(pages.map((p) => [p.page_id, p]));
const catParents = new Map(); // raw cat -> raw parents
const addParent = (child, parent) => {
  if (!catParents.has(child)) catParents.set(child, []);
  if (!catParents.get(child).includes(parent)) catParents.get(child).push(parent);
};
for (const l of links) {
  if (l.cl_type !== 'subcat') continue;
  const child = pageById.get(l.cl_from);
  if (child && child.page_namespace === 14) addParent(child.page_title, l.cl_to);
}
for (const x of xmlPages) {
  if (x.ns !== 14 || x.redirect) continue;
  const child = norm(x.title.replace(/^[^:]+:/, ''));
  for (const parent of wikitextCategories(x.text)) if (parent !== child) addParent(child, parent);
}

/** All raw ancestor categories of a raw category (cycle-safe). */
function ancestors(rawCat) {
  const seen = new Set();
  const stack = [rawCat];
  while (stack.length) {
    const c = stack.pop();
    for (const p of catParents.get(c) || []) if (!seen.has(p)) { seen.add(p); stack.push(p); }
  }
  return seen;
}

// Unified topic tree: topic -> parent topics (type suffixes merged away).
const topicParents = new Map();
for (const [child, parents] of catParents) {
  const t = topicOf(child);
  if (!t) continue;
  for (const p of parents) {
    const pt = topicOf(p);
    if (!pt || pt === t) continue;
    if (!topicParents.has(t)) topicParents.set(t, new Set());
    topicParents.get(t).add(pt);
  }
}
const topicDepth = (t, seen = new Set()) => {
  if (seen.has(t)) return 0;
  seen.add(t);
  const ps = [...(topicParents.get(t) || [])];
  return ps.length ? 1 + Math.max(...ps.map((p) => topicDepth(p, seen))) : 0;
};
const topicRoots = (t, seen = new Set()) => {
  if (seen.has(t)) return [];
  seen.add(t);
  const ps = [...(topicParents.get(t) || [])];
  return ps.length ? [...new Set(ps.flatMap((p) => topicRoots(p, seen)))] : [t];
};

// Series categories: everything under the `סדרות` root, plus "(סדרות)"/"(סדרת וידאו)" suffixed ones.
const seriesCats = new Set();
for (const c of new Set(links.map((l) => l.cl_to))) {
  const name = human(c);
  if (/\((סדרות|סדרת וידאו)\)$/.test(name) || ancestors(c).has('סדרות')) seriesCats.add(c);
}
// Parent series categories (e.g. אורות_(סדרות) -> אורות התחיה) are collections, not a series.
const seriesWithChildren = new Set();
for (const c of seriesCats) for (const p of catParents.get(c) || []) if (seriesCats.has(p)) seriesWithChildren.add(p);

// ---------------------------------------------------------------- ordering helpers
const GEMATRIA = { א: 1, ב: 2, ג: 3, ד: 4, ה: 5, ו: 6, ז: 7, ח: 8, ט: 9, י: 10, כ: 20, ך: 20, ל: 30, מ: 40, ם: 40, נ: 50, ן: 50, ס: 60, ע: 70, פ: 80, ף: 80, צ: 90, ץ: 90, ק: 100, ר: 200, ש: 300, ת: 400 };
const gematria = (w) => [...w].reduce((s, ch) => s + (GEMATRIA[ch] || 0), 0);

/** Sort key from a title: numbers in parentheses first, then Hebrew-letter numerals in order. */
function orderKey(title) {
  const nums = [];
  const paren = title.match(/\((\d+)\)/);
  if (paren) nums.push(Number(paren[1]));
  for (const m of title.matchAll(/(?:^|[\s,(:-])([א-ת]{1,4})['׳]?(?=$|[\s,)\-:])/g)) {
    if (/^(פסקה|פרק|סעיף|שיעור|הקדמה|חלק|עמ|מאמר)$/.test(m[1])) continue;
    const g = gematria(m[1]);
    if (g > 0 && m[1].length <= 3) nums.push(g);
  }
  for (const m of title.matchAll(/\b(\d+)\b/g)) nums.push(Number(m[1]));
  return nums;
}
const compareKeys = (a, b) => {
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const d = (a[i] ?? -1) - (b[i] ?? -1);
    if (d) return d;
  }
  return 0;
};

// ---------------------------------------------------------------- per-page records
const xmlByTitle = new Map(xmlPages.filter((x) => x.ns === 0).map((x) => [human(norm(x.title)), x]));
const cargoByPage = new Map(cargoVideos.map((v) => [v._pageID, v]));
// {{video|categories=...}} values, keyed by cargo row id.
const cargoCatsByRow = new Map();
for (const c of cargoVideoCats) {
  if (!cargoCatsByRow.has(c._rowID)) cargoCatsByRow.set(c._rowID, []);
  cargoCatsByRow.get(c._rowID).push(String(c._value).trim());
}
const catsByPage = new Map();
for (const l of links) {
  if (l.cl_type !== 'page') continue;
  if (!catsByPage.has(l.cl_from)) catsByPage.set(l.cl_from, []);
  catsByPage.get(l.cl_from).push(l.cl_to);
}

const records = [];
for (const p of pages) {
  if (p.page_namespace !== 0 || p.page_is_redirect) continue;
  const title = human(p.page_title);
  const xml = xmlByTitle.get(title);
  const text = xml?.text || '';
  // Stale categorylinks + the categories in the latest wikitext (see category graph above).
  const rawCats = [...new Set([...(catsByPage.get(p.page_id) || []), ...wikitextCategories(text)])];
  const cargo = cargoByPage.get(p.page_id);

  // Content type signals, strongest first.
  const signals = new Set();
  const allAnc = new Set(rawCats.flatMap((c) => [c, ...ancestors(c)]));
  for (const c of allAnc) {
    const n = human(c);
    if (TYPE_ROOTS[n]) signals.add(TYPE_ROOTS[n]);
    const s = n.match(SUFFIX);
    if (s && rawCats.includes(c)) signals.add(SUFFIX_TYPE[s[1]]);
  }
  const titleSuffix = title.match(/\((וידאו|וידאו קצר|מאמר|מאמרים|שו"ת|סדרה|שיעור)\)$/)?.[1];
  if (titleSuffix) signals.add({ 'וידאו': 'video', 'וידאו קצר': 'video', 'שיעור': 'video', 'מאמר': 'article', 'מאמרים': 'article', 'שו"ת': 'qa', 'סדרה': 'series' }[titleSuffix]);
  if (cargo) signals.add('video');
  const qaBlocks = (text.match(/\{\{\s*שות\s*\|/g) || []).length;
  if (qaBlocks) signals.add('qa');
  const youtubeIds = [...new Set([
    ...[...text.matchAll(/<youtube[^>]*>\s*([A-Za-z0-9_-]{11})/g)].map((m) => m[1]),
    ...[...text.matchAll(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/|video_id\s*=\s*)([A-Za-z0-9_-]{11})/g)].map((m) => m[1]),
  ])];
  if (cargo?.video_id) youtubeIds.unshift(...[cargo.video_id].filter((v) => !youtubeIds.includes(v)));
  // Other providers, in the formats app/content/[id] renders: Meir:<id> (meirtv) and Maale:<path>.
  const meirId = text.match(/\{\{#widget:meir\|id=(\d+)/i)?.[1];
  const maalePath = text.match(/<maale>\s*([^<\s]+)\s*<\/maale>/)?.[1];
  const otherVideo = meirId ? `Meir:${meirId}` : maalePath ? `Maale:${maalePath}` : null;
  if (youtubeIds.length || otherVideo) signals.add('video');
  const french = [...allAnc].some((c) => human(c) === FRENCH_ROOT);

  // Series membership (leaf series category).
  const series = rawCats.filter((c) => seriesCats.has(c) && !seriesWithChildren.has(c)).map((c) => human(c).replace(SUFFIX, '').trim());
  if (series.length) signals.add('series');

  const contentType = french ? 'french'
    : signals.has('series') ? 'series'
    : signals.has('qa') ? 'qa'
    : signals.has('video') ? 'video'
    : signals.has('article') ? 'article'
    : 'article';

  // Topics: every subject category (suffix removed), plus their ancestors for filtering.
  const cargoTopics = cargo ? (cargoCatsByRow.get(cargo._ID) || []).map((c) => topicOf(norm(c))).filter(Boolean) : [];
  const directTopics = [...new Set([...rawCats.map(topicOf).filter(Boolean), ...cargoTopics])].filter((t) => !series.includes(t));
  const roots = [...new Set(directTopics.flatMap((t) => topicRoots(t)))];
  const specific = [...directTopics].sort((a, b) => topicDepth(b) - topicDepth(a) || a.localeCompare(b, 'he'))[0] || null;

  records.push({
    source_page_id: p.page_id,
    title,
    content_type: contentType,
    type_signals: [...signals],
    series: series[0] || null,
    topics: directTopics,
    root_topics: roots,
    root_topic: (specific && topicRoots(specific)[0]) || roots[0] || null,
    primary_topic: specific,
    raw_categories: rawCats.map(human),
    video_id: youtubeIds[0] || otherVideo || null,
    youtube_ids: youtubeIds,
    publish_date: cargo?.publish_date || null,
    qa_blocks: qaBlocks,
    source_updated_at: xml?.timestamp || null,
    order_key: orderKey(title),
  });
}

// ---------------------------------------------------------------- title-pattern series
// "Name (N) ..." shared by 3+ pages that aren't already in a category series.
// Spelling-insensitive key: letters only, without vav/yod (plene vs. defective spelling),
// so "התורה והגאולה" / "התורה והגאלה" and "לנתיבות ישראל, מאמר" / "לנתיבות ישראל מאמר" match.
const seriesKey = (name) => name.replace(/[^א-תa-zA-Z]/g, '').replace(/[וי]/g, '').replace(/מאמר/g, '');
const categorySeries = [...new Set(records.filter((r) => r.series).map((r) => r.series))];
const byStem = new Map();
for (const r of records) {
  if (r.series) continue;
  const m = r.title.match(/^(.{4,}?)\s*[,:]?\s*\((\d{1,3})\)/);
  if (!m) continue;
  const stem = m[1].replace(/[\s,:\-]+$/, '').replace(/["'״׳]/g, '"').replace(/\s+/g, ' ');
  const key = seriesKey(stem);
  if (!byStem.has(key)) byStem.set(key, { names: new Map(), records: [] });
  const g = byStem.get(key);
  g.names.set(stem, (g.names.get(stem) || 0) + 1);
  g.records.push(r);
}
for (const [key, g] of byStem) {
  // Join an existing category series when one name is a prefix of the other
  // (e.g. "תפארת ישראל (8)" -> "תפארת ישראל - מהר"ל", "אורות התשובה התשפ"א" -> "אורות התשובה").
  const target = categorySeries.find((s) => {
    const k = seriesKey(s);
    return k.length >= 6 && (key.startsWith(k) || k.startsWith(key));
  });
  if (!target && g.records.length < 3) continue;
  const name = target || [...g.names].sort((a, b) => b[1] - a[1])[0][0];
  for (const r of g.records) {
    r.series = name;
    r.series_detected_by = target ? 'category+title' : 'title_pattern';
    if (r.content_type !== 'french') r.content_type = 'series';
  }
}
for (const r of records) if (r.series && !r.series_detected_by) r.series_detected_by = 'category';

// Episodes marked "(סדרה)" whose series category is missing: attach by title prefix
// (e.g. "אורות הקודש ב', עמ' שסד'" -> "אורות הקודש ב'"), longest series name first.
const knownSeries = [...new Set(records.filter((r) => r.series).map((r) => r.series))]
  .sort((a, b) => seriesKey(b).length - seriesKey(a).length);
// A series is also matched by the part after " - " ("עין איה - ברכות ב'" matches "ברכות ב', פרק ט'").
const seriesKeys = (s) => [s, s.split(' - ').slice(1).join(' - ')].map(seriesKey).filter((k) => k.length >= 5);
for (const r of records) {
  if (r.series || r.content_type !== 'series') continue;
  const key = seriesKey(r.title);
  const match = knownSeries.find((s) => seriesKeys(s).some((k) => key.startsWith(k)));
  if (match) { r.series = match; r.series_detected_by = 'title_prefix'; }
}
// Remaining "(סדרה)" episodes with a numbered title form a series from 2 episodes up.
const leftover = new Map();
for (const r of records) {
  if (r.series || r.content_type !== 'series') continue;
  const stem = r.title.match(/^(.{4,}?)\s*[,:]?\s*\((\d{1,3})\)/)?.[1]?.trim();
  if (stem) leftover.set(stem, [...(leftover.get(stem) || []), r]);
}
for (const [stem, rs] of leftover) {
  if (rs.length < 2) continue;
  for (const r of rs) { r.series = stem; r.series_detected_by = 'title_pattern'; }
}

// ---------------------------------------------------------------- series order
const seriesMap = new Map();
for (const r of records) {
  if (!r.series) continue;
  if (!seriesMap.has(r.series)) seriesMap.set(r.series, []);
  seriesMap.get(r.series).push(r);
}
const seriesList = [];
for (const [name, rs] of seriesMap) {
  rs.sort((a, b) => compareKeys(a.order_key, b.order_key) || a.title.localeCompare(b.title, 'he'));
  rs.forEach((r, i) => { r.series_order = i + 1; });
  seriesList.push({ name, detected_by: rs[0].series_detected_by, episodes: rs.length });
}

// ---------------------------------------------------------------- topic tree output
const topicCounts = new Map();
for (const r of records) for (const t of r.topics) topicCounts.set(t, (topicCounts.get(t) || 0) + 1);
const allTopics = new Set([...topicCounts.keys(), ...topicParents.keys(), ...[...topicParents.values()].flatMap((s) => [...s])]);
const topics = [...allTopics].map((t) => ({
  name: t,
  parents: [...(topicParents.get(t) || [])],
  depth: topicDepth(t),
  pages: topicCounts.get(t) || 0,
}));

for (const r of records) delete r.order_key;
fs.writeFileSync(path.join(DIR, 'taxonomy.json'), JSON.stringify({ records, series: seriesList, topics }, null, 1));

const count = (f) => records.reduce((m, r) => ((m[f(r)] = (m[f(r)] || 0) + 1), m), {});
console.log('pages:', records.length);
console.log('content_type:', count((r) => r.content_type));
console.log('series:', seriesList.length, 'episodes:', records.filter((r) => r.series).length);
console.log('topics:', topics.length, 'roots:', topics.filter((t) => !t.parents.length && t.pages + 0 >= 0).length);
console.log('pages without topic:', records.filter((r) => !r.topics.length).length);
console.log('pages with video:', records.filter((r) => r.video_id).length, '| with publish_date:', records.filter((r) => r.publish_date).length);
