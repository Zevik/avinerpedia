// Drafts the curated topic taxonomy for review: classifies every source topic as a filter
// node, a parasha, a series, a tag (question/sentence), a typo duplicate or a concatenated
// path, and maps it into a ~12-topic filter tree.
// Usage: node scripts/source/draft-topic-taxonomy.mjs   (needs support/derived/taxonomy.json)
// Writes docs/TOPIC_TAXONOMY_DRAFT.md and docs/topic-taxonomy-mapping.csv (editable in Excel).
import fs from 'fs';

const { topics, records, series } = JSON.parse(fs.readFileSync('support/derived/taxonomy.json', 'utf8'));
const topicByName = new Map(topics.map((t) => [t.name, t]));

// ---------------------------------------------------------------- 1. curated filter tree
// Core topic -> sub-topics; each sub-topic lists the source topic names that land in it
// directly. A source topic named like a core topic ("הלכה", "תורה") maps to the core itself.
// Everything else is placed by rules or by inheriting from its source parents.
const TREE = {
  'הלכה': {
    'שבת': ['שבת', 'שבת ויום טוב', 'שבת - הלכה', 'שבת ויום טוב - הלכה', 'שבת - מלאכות', 'שבת – מלאכות'],
    'כשרות ומזון': ['כשרות ומזון', 'כשרות', 'בשר וחלב', 'כשרות - הלכה', 'טבילת כלים', 'בישול עכו"ם', 'תרומות ומעשרות', 'יורה דעה - איסור והיתר', 'הכשרת כלים'],
    'צניעות': ['צניעות', 'צניעות - הלכה', 'בגדים'],
    'טהרת המשפחה': ['טהרת המשפחה', 'מקווה- הלכה', 'טהרת המשפחה - הלכה'],
    'נישואין ואישות': ['נישואין וגירושין - הלכה', 'שידוכים ונישואים - הלכה', 'אישות ומשפחה - הלכה', 'גיטין\\גירושים'],
    'אבלות': ['אבלות', 'אבילות', 'אבלות - הלכה'],
    'דיני ממונות': ['דיני ממונות', 'חושן משפט', 'ריבית', 'הלכות חברה', 'עדות'],
    'צדקה': ['צדקה', 'צדקה - הלכה'],
    'בין אדם לחברו': ['בין אדם לחבירו- הלכה'],
    'הלכות ציבור': ['הלכות ציבור', 'בית כנסת - הלכה', 'שליח ציבור', 'בית כנסת ובית מדרש'],
    'הלכות היום-יום': ['השכמת הבוקר - הלכה', 'נטילת ידיים', 'סעודה', 'שינה וסדר הלילה', 'בית הכסא', 'תספורת וגילוח'],
    'מצוות ומנהגים': ['ציצית ותפילין - הלכה', 'ציצית ותפילין', 'תפילין', 'ציצית', 'מזוזה', 'מנהגים', 'הלכות שונות', 'שונות - הלכה', 'עניינים שונים', 'מצוות הפרט', 'כללים ועניינים שונים', 'מקומות קדושים - הלכה'],
    'ברית מילה': ['ברית מילה'],
    'רפואה ופיקוח נפש': ['פיקוח נפש', 'בריאות', 'רפואה', 'הצלת נפשות - הלכה', 'תרומת איברים', 'טיפול רפואי', 'זהירות', 'ונשמרתם לנפשותיכם'],
    'גיור': ['גיור', 'גיור - הלכה'],
    'פסיקת הלכה': ['פסיקת הלכה'],
  },
  'מועדים': {
    'ימים נוראים': ['ראש השנה', 'יום כיפור', 'עשרת ימי תשובה', 'סליחות', 'אלול', 'צום גדליה', 'חודש אלול'],
    'סוכות ושמחת תורה': ['סוכות', 'שמחת תורה', 'שמיני עצרת - שמחת תורה', 'חול המועד', 'סוכה'],
    'חנוכה': ['חנוכה'],
    'ט"ו בשבט': ['ט"ו בשבט'],
    'פורים': ['פורים', 'תענית אסתר', 'פרשת זכור', 'חודש אדר'],
    'פסח וספירת העומר': ['פסח', 'ספירת העומר', 'שובבי"ם'],
    'ל"ג בעומר': ['ל"ג בעומר'],
    'שבועות': ['שבועות'],
    'בין המצרים ותעניות': ['בין המצרים', 'תשעה באב', 'י"ז בתמוז', 'עשרה בטבת', 'צומות ותעניות', 'זכר לחורבן', 'הלכות תענית', 'ט"ו באב', 'תעניות ובין המצרים'],
    'יום העצמאות ויום ירושלים': ['יום העצמאות', 'יום ירושלים'],
    'ימי זיכרון ושואה': ['ימי זיכרון', 'ימי הזיכרון', 'יום השואה', 'יום השואה והגבורה', 'יום השואה ויום הזיכרון'],
    'שמיטה': ['שמיטה'],
  },
  'אמונה': {
    'שאלות באמונה': ['שאלות כלליות באמונה', 'שאלות שונות באמונה', 'לימוד אמונה', 'קושיות והוכחות'],
    'מחשבת ישראל': [],
    'השגחה ובחירה': ['השגחה ובחירה', 'השגחה'],
    'גאולה ומשיח': ['גאולה ומשיח', 'גאולה'],
    'עבודת ה\'': ["עבודת ה'", "עבודת ד'", "דבקות בד'", 'השפעת המצוות'],
    'תשובה': ['תשובה'],
    'צרות וקשיים': ['צרות וקשיים'],
    'סגולות ואמונות טפלות': ['סגולות ואמונות שונות', 'אמונות טפלות', 'אמונות תפלות', 'דרכי אמורי'],
    'דתות ועמים': ['דתות הגויים', 'נצרות', 'גויים ביהדות', 'עבודה זרה', 'חוקות הגויים', 'היחס לנצרות'],
    'זרמים ביהדות': ['רפורמים וקונסרבטיבים', 'רפורמה'],
    'תורה ומדע': ['תורה ומדע', 'התורה במציאות'],
  },
  // Source topic "תורה" is mapped to this core via CORE_ALIASES below.
  'תורה ולימוד': {
    'לימוד תורה': ['לימוד תורה', 'שאלות כלליות - תורה', 'השפעת התורה', 'תורה אלוקית'],
    'תלמידי חכמים ואמונת חכמים': ['תלמידי חכמים', 'אמונת חכמים', 'רבנים'],
    'גמרא וסוגיות': ['סוגיות בגמרא', 'סוגיות סוגיות בגמרא', 'גמרא', 'סיום מסכת'],
    'תנ"ך': ['שיעורים בתנ"ך', 'אישים בתנ"ך', 'משלי', 'לימוד תנ"ך באמונה'],
    'ישיבות ומכינות': ['ישיבה', 'ישיבות', 'מכינות קדם צבאיות'],
    'קבלה וחסידות': ['לימוד קבלה', 'מקובלים', 'תורת רבי נחמן מברסלב', 'תורת רבי נחמן', 'קבלה', 'העולם הנסתר'],
    'מדרשים ואגדות': ['מדרשים ואגדות'],
    'ספרים': ['ספרים', 'ספרים שונים'],
  },
  'תפילה': {
    'הלכות תפילה': ['תפילה - הלכה', 'תפילה - הלכות', 'קריאת שמע', 'תפילת שמונה עשרה', 'מנחה ומעריב', 'קריאת התורה', 'ברכת כהנים', 'הכנת הגוף והמקום'],
    'ביאור התפילה': ['באור תפילה', 'השפעת התפילה', 'שאלות כלליות - תפילה'],
    'ברכות': ['ברכות', 'ברכות - הלכה', 'תפילת הדרך'],
  },
  'מדינת ישראל וצה"ל': {
    'צה"ל וביטחון': ['צה"ל', 'צה"ל (מאמרים', 'הלכות חגים לחייל', 'מוסר במלחמה', 'חטופים'],
    'ארץ ישראל': ['ארץ ישראל', 'התיישבות', 'אהבת הארץ', 'מצוות ישוב הארץ'],
    'פוליטיקה ובחירות': ['פוליטיקה', 'פוליטיקה ובחירות', 'בחירות', 'ראש הממשלה'],
    'דת ומדינה': ['דת ומדינה', 'דתיים - חילונים', 'הרבנות הראשית'],
    'הסכסוך הישראלי-ערבי': ['סכסוך ישראלי - ערבי'],
    'גאולת ישראל וציונות': ['המדינה אתחלתא דגאולה', 'ציונות', 'הרצל', 'עם ישראל'],
    'ישראל והעמים': ['המדינות ואומות העולם'],
    'מגזרים ועדות': ['מגזרים ועדות'],
    'הר הבית ובית המקדש': ['הר הבית', 'בית המקדש', 'הכותל המערבי', 'הר הבית ובית המקדש'],
    'גוש קטיף והגירוש': ['גוש קטיף והגירוש'],
    'מוסריות מדינית': ['מוסריות מדינית'],
  },
  'אקטואליה ותרבות': {
    'אקטואליה': ['אקטואליה'],
    'תרבות המערב': ['תרבות המערב'],
    'תרבות הפנאי': ['תרבות הפנאי'],
    'אינטרנט וסמארטפון': ['אינטרנט וסמארטפון'],
    'טבע וסביבה': ['טבע וסביבה'],
    'תנועות חברתיות': ['תנועות חברתיות'],
  },
  'מוסר ומידות': {
    'מידות': ['מידות', 'עבודת המידות', 'מידות נוספות', 'צניעות - מידות', 'גאווה', 'שמחה', 'והלכת בדרכיו', 'דאגה לזולת- מידות', 'שתיקה- מידות'],
    'יצר הרע': ['יצר הרע'],
    'ביטחון': ['מידת הביטחון'],
    'שמירת הלשון': ['שמירת הלשון'],
    'מוסר חברתי': ['מוסר חברתי', 'דרך ארץ', 'חסד', 'הכרת הטוב', 'מוסריות בעבודה'],
    'מוסר בחיי הפרט': ['מוסר בחיי הפרט', 'מוסריות', 'חיי הפרט', 'מוסר ביהדות', 'זהירות בדרכים'],
  },
  'זוגיות ומשפחה': {
    'שידוכים וחתונה': ['שידוכים והכנה לחתונה', 'שידוכים', 'הכנה לחתונה', 'אירוסין', 'חתונה', 'חתונה - חופה וקידושין'],
    'חיי זוגיות': ['זוגיות', 'עבודת הזוגיות', 'זוגיות במקורות', 'חינוך זוגי', 'אהבה', 'שמירת התא המשפחתי', 'אישות', 'צניעות - משפחה'],
    'הורים וילדים': ['הורים וילדים', 'כיבוד הורים', 'חיי משפחה'],
    'הריון ולידה': ['הריון ולידה', 'קריאת שמות'],
    'נשים': ['נשים'],
    'נטיות הפוכות': ['נטיות הפוכות'],
  },
  'חינוך': {
    'חינוך ילדים': ['חינוך ילדים'],
    'חינוך לתורה ומצוות': ['חינוך לתורה ומצוות', 'חינוך במקורות', 'חינוך - הלכה'],
    'מוסדות חינוך ולימודים': ['מוסדות חינוך', 'לימודים', 'הוראה', 'מלמדים ותלמידים'],
  },
  'אישים': {
    'הרב קוק': ['הרב קוק', 'תורת הראי"ה'],
    'הרב צבי יהודה': ['הרב צבי יהודה זצ"ל'],
    'רבנים ואישים': ['הרב נחמיה לביא זצ"ל', 'הרב מנחם בן יעקב'],
    'הספדים ואזכרות': [],
  },
};
// Series (books/courses) are their own entity on /series; for topic filtering each series
// also gets the node it belongs to.
const SERIES_NODES = [
  [/אורות|עין איה|למהלך האידאות|מידות הראיה|קריאה גדולה/, 'אישים › הרב קוק'],
  [/לנתיבות ישראל|יסוד שיטת הרב קוק/, 'אישים › הרב צבי יהודה'],
  [/כוזרי|שמונה פרקים|מסילת ישרים|תפארת ישראל|נתיב התורה/, 'אמונה › מחשבת ישראל'],
  [/שמירת הלשון/, 'מוסר ומידות › שמירת הלשון'],
  [/יוסף הצדיק/, 'תורה ולימוד › תנ"ך'],
  [/לזמרת בצבא/, 'מדינת ישראל וצה"ל › צה"ל וביטחון'],
];
// Shulchan Aruch sections: a second axis for Q&A, not part of the filter tree above.
const SHULCHAN_ARUCH = ['אורח חיים', 'יורה דעה', 'אבן העזר', 'חושן משפט'];
// Source containers/collections that are not subjects.
// Values starting with "מקור:" become content_items.source_collection (metadata, not a topic).
const COLLECTIONS = {
  'שיעורים מישיבת עטרת ירושלים': 'מקור: ישיבת עטרת ירושלים',
  'שיעורי ארח"צ מהישיבה': 'מקור: ישיבת עטרת ירושלים',
  'ישיבת עטרת ירושלים': 'מקור: ישיבת עטרת ירושלים',
  'שיעורי ארח"צ בישיבה': 'מקור: ישיבת עטרת ירושלים',
  // Dissolved container: its children are mapped to the core topics on their own.
  'מיוחדים': 'מכל מפורק (ילדיו מופו לנושאי הליבה)',
  'שו"ת': 'מכל (סוג תוכן)',
  'שו"ת סמס - עולם קטן': 'מקור: שו"ת סמס - עולם קטן',
  'דפים קא\' - ר\'': 'מקור: דפים קא\' - ר\'',
  'כללי': 'מכל (ללא נושא)',
};

// ---------------------------------------------------------------- 2. parasha tree
const CHUMASH = {
  'בראשית': ['בראשית', 'נח', 'לך לך', 'וירא', 'חיי שרה', 'תולדות', 'ויצא', 'וישלח', 'וישב', 'מקץ', 'ויגש', 'ויחי'],
  'שמות': ['שמות', 'וארא', 'בא', 'בשלח', 'יתרו', 'משפטים', 'תרומה', 'תצוה', 'כי תשא', 'ויקהל', 'פקודי'],
  'ויקרא': ['ויקרא', 'צו', 'שמיני', 'תזריע', 'מצורע', 'אחרי מות', 'קדושים', 'אמור', 'בהר', 'בחוקותי'],
  'במדבר': ['במדבר', 'נשא', 'בהעלותך', 'שלח', 'קרח', 'חוקת', 'בלק', 'פנחס', 'מטות', 'מסעי'],
  'דברים': ['דברים', 'ואתחנן', 'עקב', 'ראה', 'שופטים', 'כי תצא', 'כי תבוא', 'נצבים', 'וילך', 'האזינו', 'וזאת הברכה'],
};
const PARASHA_VARIANTS = { 'ניצבים': 'נצבים', 'פינחס': 'פנחס', 'קורח': 'קרח', 'תצווה': 'תצוה', 'חקת': 'חוקת', 'בחקותי': 'בחוקותי', 'בהעלתך': 'בהעלותך', 'שלח לך': 'שלח', 'כי תבא': 'כי תבוא' };
const chumashOf = new Map(Object.entries(CHUMASH).flatMap(([c, ps]) => ps.map((p) => [p, c])));
function parashaOf(name) {
  const m = name.match(/^פרשת\s+(.+)$/);
  if (!m) return null;
  const raw = m[1].replace(/-/g, ' ').replace(/\s+/g, ' ').trim();
  const p = PARASHA_VARIANTS[raw] || raw;
  return chumashOf.has(p) ? { parasha: p, chumash: chumashOf.get(p) } : null;
}
const CHUMASH_TOPICS = { 'חומש בראשית': 'בראשית', 'חומש שמות': 'שמות', 'חומש ויקרא': 'ויקרא', 'חומש במדבר': 'במדבר', 'חומש דברים': 'דברים' };
const PARASHA_HUBS = ['פרשת השבוע', 'פרשת שבוע', 'פרשת השבוע: פרשת שבוע', 'זוגיות בפרשה'];

// ---------------------------------------------------------------- 3. series
const seriesKey = (s) => s.replace(/[^א-תa-zA-Z]/g, '').replace(/[וי]/g, '');
const BOOKS = ['כוזרי', 'אורות', 'עין איה', 'שמונה פרקים', 'מסילת ישרים', 'תפארת ישראל', 'נתיב התורה', 'למהלך האידאות', 'מידות הראיה', 'אורות התשובה', 'אורות התחיה', 'אורות הקודש', 'אורות ישראל', 'לנתיבות ישראל'];
function seriesOf(name) {
  const k = seriesKey(name.replace(/\s*\((סדרות|סדרה|סדרת וידאו)\)$/, ''));
  if (k.length < 3) return null;
  const hit = series.find((s) => seriesKey(s.name) === k || seriesKey(s.name).startsWith(k) && k.length >= 5);
  if (hit) return hit.name;
  const book = BOOKS.find((b) => seriesKey(b) === k);
  return book ? `ספר: ${book}` : null;
}

// ---------------------------------------------------------------- 4. tags (questions/sentences)
const QUESTION_START = /^(האם|מה|מהו|מהי|למה|מדוע|כיצד|איך|מתי|מי|היכן|כמה|האין|הלכות\s+\S+\s+\S+\s+\S+)\b/;
function isTag(name, pages) {
  if (name.includes('?')) return 'שאלה';
  if (/^יצירת /.test(name)) return 'שארית ייבוא ("יצירת ...")';
  if (QUESTION_START.test(name)) return 'שאלה';
  const words = name.split(/\s+/).length;
  if (words >= 6) return 'משפט ארוך';
  if (words >= 4 && pages <= 1) return 'ביטוי ספציפי עם פריט יחיד';
  return null;
}

// ---------------------------------------------------------------- 5. typo / duplicate detection
// Punctuation/spacing-insensitive key ("בר מצוה" = "בר-מצוה", "פסח – מצה" = "פסח - מצה").
// "X - הלכה" is NOT folded into X here: it becomes the third level "הלכות X".
const dupKey = (s) => s.replace(/["'״׳\-–\s:\\]/g, '');
// Plene/defective spelling ("קדושת כוהנים" = "קדושת כהנים"): equal without ו/י, and the
// lengths differ by at most 2, so short words don't collapse ("ישיבות" ≠ "שבת").
const pleneEqual = (a, b) => {
  const [x, y] = [dupKey(a), dupKey(b)];
  return x !== y && Math.abs(x.length - y.length) <= 2 && x.replace(/[וי]/g, '') === y.replace(/[וי]/g, '') && x.replace(/[וי]/g, '').length >= 3;
};
// Corpus word frequency, to pick the correct spelling of a typo pair ("תנועה" beats "תנואה").
const wordFreq = new Map();
for (const r of records) for (const w of r.title.split(/[\s,.:;!?()"'-]+/)) if (w) wordFreq.set(w, (wordFreq.get(w) || 0) + 1);
const spellingScore = (name) => name.split(/\s+/).reduce((s, w) => s + Math.log1p(wordFreq.get(w) || 0), 0);
function editDistance(a, b) {
  if (Math.abs(a.length - b.length) > 2) return 99;
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}

// ---------------------------------------------------------------- classify
const nodeOfSource = new Map(); // source name -> "core › sub"
// Source topics that are the same subject as a core topic under another name.
const CORE_ALIASES = { 'תורה': 'תורה ולימוד', 'מדינת ישראל': 'מדינת ישראל וצה"ל' };
for (const [alias, core] of Object.entries(CORE_ALIASES)) nodeOfSource.set(alias, core);
for (const [core, subs] of Object.entries(TREE)) {
  nodeOfSource.set(core, `${core}`);
  for (const [sub, names] of Object.entries(subs)) for (const n of names) if (!nodeOfSource.has(n) || nodeOfSource.get(n) === n) nodeOfSource.set(n, `${core} › ${sub}`);
}

const result = new Map(); // name -> { kind, target, note }
const set = (name, kind, target, note = '') => result.set(name, { kind, target, note });

// French lessons (Latin names or under the French tree) live on /french, not in the filter.
const FRENCH_ROOTS = new Set(['Emouna', 'Erets Israel', "L'état d'Israël", 'Le couple et la famille', 'La Paracha de la semaine']);
const isFrench = (t) => /^[A-Za-zÀ-ÿ'’ ]+$/.test(t.name) || t.parents.some((p) => FRENCH_ROOTS.has(p));
// Content formats under the source's "מיוחדים" container.
const FORMATS = { 'מאמרים מיוחדים': 'מקור: מאמרים מיוחדים', 'ציוצים': 'מקור: ציוצים', 'שירים': 'מקור: שירים' };
// "X - הלכה" / "X - הלכות": a third level "הלכות X" under X's node (מועדים › חנוכה › הלכות חנוכה).
const HALACHA_SUFFIX = /^(.+?)\s*-\s*הלכ(?:ה|ות)$/;

// Pass A: structural kinds.
for (const t of topics) {
  const n = t.name;
  if (COLLECTIONS[n]) { set(n, 'collection', COLLECTIONS[n]); continue; }
  if (FORMATS[n]) { set(n, 'collection', FORMATS[n]); continue; }
  if (isFrench(t)) { set(n, 'collection', 'Cours en Français (/french)'); continue; }
  const halacha = n.match(HALACHA_SUFFIX);
  if (halacha && nodeOfSource.has(halacha[1].trim()) && !nodeOfSource.has(n)) {
    const base = halacha[1].trim();
    const node = nodeOfSource.get(base);
    // Only as a third level: the base must map to a sub-topic, not a bare core topic.
    if (node.includes(' › ')) { set(n, 'filter', `${node} › הלכות ${base}`, 'רמה שלישית: הלכות'); continue; }
  }
  if (SHULCHAN_ARUCH.includes(n)) { set(n, 'shulchan-aruch', `ציר שו"ת: ${n}`); continue; }
  const par = parashaOf(n);
  if (par) { set(n, 'parasha', `תורה ולימוד › פרשת השבוע › ${par.chumash} › ${par.parasha}`); continue; }
  if (CHUMASH_TOPICS[n]) { set(n, 'parasha', `תורה ולימוד › פרשת השבוע › ${CHUMASH_TOPICS[n]}`); continue; }
  if (PARASHA_HUBS.includes(n)) { set(n, 'parasha', 'תורה ולימוד › פרשת השבוע'); continue; }
  const ser = seriesOf(n);
  if (ser) { set(n, 'series', ser); continue; }
  if (/[:\[\]]/.test(n)) {
    const segs = n.replace(/\[\[קטגוריה:?/g, ':').replace(/\s*\((מאמרים|וידאו|שו"ת)\)\s*/g, ' ').split(':').map((s) => s.trim()).filter(Boolean);
    const mapped = segs.map((s) => nodeOfSource.get(s)).find(Boolean);
    set(n, 'concatenated', mapped || '(לבדיקה)', `פוצל ל: ${segs.join(' | ')}`);
    continue;
  }
  if (nodeOfSource.has(n)) { set(n, 'filter', nodeOfSource.get(n)); continue; }
}

// Pass B: typo duplicates among the still-unclassified and filter names.
const pool = topics.filter((t) => !result.has(t.name) || result.get(t.name).kind === 'filter');
const byDup = new Map();
for (const t of pool) {
  const k = dupKey(t.name);
  if (k.length < 3) continue;
  if (!byDup.has(k)) byDup.set(k, []);
  byDup.get(k).push(t);
}
const dupPairs = [];
for (const group of byDup.values()) if (group.length > 1) dupPairs.push(group);
// Near-misses (one letter apart). Short words are too risky ("גאווה" vs "גאולה" are
// different words), so only names of 6+ letters, and only when one side is rare (<=3 items).
const substantive = pool.filter((t) => t.name.replace(/\s/g, '').length >= 6 && !/\?/.test(t.name));
for (let i = 0; i < substantive.length; i++)
  for (let j = i + 1; j < substantive.length; j++) {
    const a = substantive[i], b = substantive[j];
    if (dupKey(a.name) === dupKey(b.name)) continue;
    if (Math.min(a.pages, b.pages) > 3) continue;
    if (pleneEqual(a.name, b.name) || (editDistance(a.name, b.name) === 1 && !/\d/.test(a.name + b.name))) dupPairs.push([a, b]);
  }
// Short plene/defective pairs too ("יחוד" / "ייחוד").
for (let i = 0; i < pool.length; i++)
  for (let j = i + 1; j < pool.length; j++)
    if (pool[i].name.replace(/\s/g, '').length < 6 && pleneEqual(pool[i].name, pool[j].name)) dupPairs.push([pool[i], pool[j]]);

for (const group of dupPairs) {
  // Canonical: a curated name, then more items, then the spelling more common in titles.
  const canonical = [...group].sort((a, b) =>
    (nodeOfSource.has(b.name) ? 1 : 0) - (nodeOfSource.has(a.name) ? 1 : 0) ||
    b.pages - a.pages ||
    spellingScore(b.name) - spellingScore(a.name))[0];
  for (const t of group) {
    // Never override a curated/filter classification (incl. the "הלכות X" third level).
    if (t === canonical || result.get(t.name)?.kind === 'filter') continue;
    const target = result.get(canonical.name)?.target || nodeOfSource.get(canonical.name) || null;
    set(t.name, 'typo-duplicate', target || `→ ${canonical.name}`, `כפילות של "${canonical.name}"`);
  }
}

// Pass C: tags, then inherit a filter node from the source parents.
function inherited(name, seen = new Set()) {
  if (seen.has(name)) return null;
  seen.add(name);
  const t = topicByName.get(name);
  for (const p of t?.parents || []) {
    const r = result.get(p);
    if (r && ['filter', 'typo-duplicate', 'concatenated'].includes(r.kind) && !r.target.startsWith('(')) return r.target;
    if (r?.kind === 'parasha') return r.target;
    // Small halachic Q&A topics hang off Shulchan Aruch sections: they belong under הלכה.
    if (r?.kind === 'shulchan-aruch') return 'הלכה';
    const up = inherited(p, seen);
    if (up) return up;
  }
  return null;
}

/**
 * For a topic with no usable parent: the node most common among the other topics of the
 * same items (e.g. "עירובין" sits on items that are otherwise tagged "שבת").
 */
function coOccurring(name) {
  const votes = new Map();
  for (const r of records) {
    if (!r.topics.includes(name)) continue;
    for (const other of r.topics) {
      if (other === name) continue;
      const c = result.get(other);
      if (c && ['filter', 'typo-duplicate', 'concatenated', 'parasha'].includes(c.kind) && !c.target.startsWith('(')) {
        votes.set(c.target, (votes.get(c.target) || 0) + 1);
      }
    }
  }
  return [...votes].sort((a, b) => b[1] - a[1] || b[0].length - a[0].length)[0]?.[0] || null;
}

/** Topics used only on Q&A pages with no other topic: Q&A here is halachic, so under הלכה. */
function qaFallback(name) {
  const tagged = records.filter((r) => r.topics.includes(name));
  return tagged.length && tagged.every((r) => r.content_type === 'qa') ? 'הלכה' : null;
}

for (const t of topics) {
  if (result.has(t.name)) continue;
  const tag = isTag(t.name, t.pages);
  const parent = inherited(t.name) || coOccurring(t.name) || qaFallback(t.name);
  if (tag) set(t.name, 'tag', parent || '(ללא הורה - לבדיקה)', tag);
  else if (t.pages < 3 && parent) set(t.name, 'folded', parent, `פחות מ-3 פריטים, מקופל להורה`);
  else if (parent) set(t.name, 'filter-candidate', parent, 'תת-נושא אפשרי (לא ברשימה המאוצרת) - כרגע מקופל להורה');
  else set(t.name, 'review', '(לבדיקה)', t.pages ? '' : 'ללא פריטים');
}

// ---------------------------------------------------------------- counts per filter node
const nodeItems = new Map();
const add = (node, id) => { if (!nodeItems.has(node)) nodeItems.set(node, new Set()); nodeItems.get(node).add(id); };
for (const r of records) {
  for (const name of r.topics) {
    const c = result.get(name);
    if (!c || !c.target || c.target.startsWith('(') || ['series', 'collection', 'shulchan-aruch'].includes(c.kind)) continue;
    const parts = c.target.split(' › ');
    for (let i = 1; i <= parts.length; i++) add(parts.slice(0, i).join(' › '), r.source_page_id);
  }
}
const count = (node) => nodeItems.get(node)?.size || 0;

// ---------------------------------------------------------------- write CSV
const KIND_HE = {
  filter: 'נושא סינון', 'filter-candidate': 'מקופל (מועמד לתת-נושא)', folded: 'מקופל', tag: 'תגית',
  parasha: 'פרשת השבוע', series: 'סדרה/ספר', 'typo-duplicate': 'כפילות/שגיאת כתיב', concatenated: 'נתיב משורשר',
  'shulchan-aruch': 'ציר שו"ת', collection: 'אוסף/מכל', review: 'לבדיקה',
};
const csvCell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
const rows = [...topics].sort((a, b) => b.pages - a.pages).map((t) => {
  const c = result.get(t.name);
  return [t.name, t.pages, KIND_HE[c.kind], c.target, c.note, t.parents.join(' | ')].map(csvCell).join(',');
});
fs.mkdirSync('docs', { recursive: true });
fs.writeFileSync('docs/topic-taxonomy-mapping.csv',
  '﻿' + ['נושא מקור', 'פריטים', 'סיווג', 'יעד בעץ החדש', 'הערה', 'הורים במקור'].map(csvCell).join(',') + '\n' + rows.join('\n') + '\n');

// ---------------------------------------------------------------- write MD
const kindCounts = {};
for (const c of result.values()) kindCounts[c.kind] = (kindCounts[c.kind] || 0) + 1;
const examples = (kind, n = 8) => [...result].filter(([, c]) => c.kind === kind).slice(0, n)
  .map(([name, c]) => `| ${name} | ${c.target} | ${c.note} |`).join('\n');

let md = `# טיוטת טקסונומיה לנושאים - לאישור

> נוצר אוטומטית על ידי \`scripts/source/draft-topic-taxonomy.mjs\` מתוך ${topics.length} נושאי המקור ו-${records.length} דפי המקור.
> **זו טיוטה לבדיקה.** המיפוי המלא, שורה לכל נושא, נמצא ב-[\`docs/topic-taxonomy-mapping.csv\`](topic-taxonomy-mapping.csv) (נפתח באקסל). אפשר לתקן שם את עמודת "יעד בעץ החדש" ואת הסיווג, ואני אחיל את התיקונים.

## העיקרון: ארבע שכבות נפרדות

| שכבה | תפקיד | איפה מופיעה |
|---|---|---|
| **עץ סינון מאוצר** | ${Object.keys(TREE).length} נושאי ליבה, כל אחד עם תתי-נושאים משמעותיים | סרגלי הסינון ב-/videos, /articles, /qa ודף /topics |
| **עץ פרשת השבוע** | תורה ולימוד › פרשת השבוע › חומש › פרשה | סינון ייעודי + דף פרשת השבוע |
| **סדרות** | ספרים/קורסים (כוזרי, עין איה...) | /series בלבד, לא בסינון הנושאים |
| **תגיות** | שאלות ספציפיות, משפטים, ביטויים חד-פעמיים | צ'יפים בתחתית הדף וחיפוש, **לא** בסינון |

ציר נוסף לשו"ת: **חלקי השולחן ערוך** (${SHULCHAN_ARUCH.join(', ')}) - סינון שני בדף /qa.

## סיכום הסיווג

| סיווג | נושאים | משמעות |
|---|---|---|
${Object.entries(kindCounts).sort((a, b) => b[1] - a[1]).map(([k, n]) => `| ${KIND_HE[k]} | ${n} | ${{
  filter: 'נכנס ישירות לצומת בעץ המאוצר',
  'filter-candidate': 'נושא עם 3+ פריטים שאינו ברשימה; מקופל להורה. אפשר לקדם לתת-נושא',
  folded: 'פחות מ-3 פריטים; הפריטים עוברים להורה',
  tag: 'שאלה/משפט - נשאר תגית; הפריטים גם מקבלים את צומת ההורה',
  parasha: 'עבר לעץ פרשת השבוע',
  series: 'שם ספר/סדרה - עבר לסדרות',
  'typo-duplicate': 'אוחד עם הצורה הקנונית',
  concatenated: 'נתיב משורשר (a:b:c) - פוצל ומופה לפי המקטע הראשון המוכר',
  'shulchan-aruch': 'ציר השו"ת',
  collection: 'מכל/אוסף במקור, לא נושא',
  review: 'לא נמצא מקום אוטומטי - צריך החלטה',
}[k]} |`).join('\n')}

## 1. עץ הסינון המוצע

המספרים הם כמות הפריטים (דפים) שיופיעו תחת כל צומת אחרי המיפוי.

`;
for (const [core, subs] of Object.entries(TREE)) {
  md += `### ${core} (${count(core)})\n\n`;
  md += Object.keys(subs).map((sub) => `- ${sub} (${count(`${core} › ${sub}`)})`).join('\n') + '\n\n';
  const candidates = [...result].filter(([, c]) => c.kind === 'filter-candidate' && c.target.split(' › ')[0] === core)
    .map(([name]) => ({ name, pages: topicByName.get(name).pages })).sort((a, b) => b.pages - a.pages).slice(0, 8);
  if (candidates.length) md += `  *מועמדים נוספים לתת-נושא (כרגע מקופלים):* ${candidates.map((c) => `${c.name} (${c.pages})`).join(', ')}\n\n`;
}

md += `## 2. עץ פרשת השבוע

תחת **תורה ולימוד › פרשת השבוע** (${count('תורה ולימוד › פרשת השבוע')} פריטים). "פרשת השבוע" ו"פרשת שבוע" במקור הן אותו מכל ואוחדו.

| חומש | פרשות (פריטים) |
|---|---|
${Object.entries(CHUMASH).map(([c, ps]) => `| ${c} (${count(`תורה ולימוד › פרשת השבוע › ${c}`)}) | ${ps.map((p) => `${p} (${count(`תורה ולימוד › פרשת השבוע › ${c} › ${p}`)})`).join(', ')} |`).join('\n')}

## 3. סדרות וספרים שהוסרו מהנושאים

| נושא מקור | יעד | |
|---|---|---|
${examples('series', 30)}

## 4. תגיות (לא בסינון)

${kindCounts.tag || 0} נושאים. דוגמאות:

| תגית | הפריטים שלה גם תחת | סוג |
|---|---|---|
${examples('tag', 15)}

## 5. כפילויות ושגיאות כתיב שאוחדו

| נושא | יעד | |
|---|---|---|
${examples('typo-duplicate', 40)}

## 6. נתיבים משורשרים שפוצלו

| נושא מקור | יעד | פיצול |
|---|---|---|
${examples('concatenated', 25)}

## אוספים ומכלים (לא נושאים)

| נושא מקור | הצעה | |
|---|---|---|
${examples('collection', 20)}

## דורש החלטה שלך

1. **"שיעורי ישיבת עטרת ירושלים"** (כ-1,100 דפים) - זה אוסף לפי מקור, לא נושא. להציג כסדרה/אוסף נפרד, או כסינון "מקור"?
2. **"מיוחדים"** - מכל במקור (מתחתיו אקטואליה, אישים ועוד). הצעתי לפזר את ילדיו לנושאי הליבה.
3. **תתי-נושאים מועמדים** - בכל נושא ליבה מופיעים למעלה נושאים עם 3+ פריטים שלא בחרתי. לקדם חלק מהם?
4. **${kindCounts.review || 0} נושאים ללא מקום אוטומטי** - מסומנים "לבדיקה" ב-CSV.
5. **שמות** - אפשר לשנות כל שם בעץ (למשל "תורה ולימוד" או "תורה").

## השלב הבא אחרי אישור

- הוספת \`filter_node\` לנושאים (או טבלת צמתים), מיפוי כל \`content_topics\` לצמתים, ועדכון \`sub_category\` כך שסרגלי הסינון יציגו רק את העץ המאוצר.
- סינון בשתי רמות (נושא › תת-נושא) עם מונים, חיפוש בתוך הסינון, ומגירה במובייל.
- עץ פרשת השבוע עם דף ייעודי, ציר שולחן ערוך ב-/qa, והתגיות כצ'יפים בתחתית הדף.
`;
fs.writeFileSync('docs/TOPIC_TAXONOMY_DRAFT.md', md);

// Tree order and rules for scripts/source/apply-topic-taxonomy.mjs (the CSV holds the
// per-topic mapping and is the editable source of truth).
const treePaths = [];
for (const [core, subs] of Object.entries(TREE)) {
  treePaths.push(core);
  for (const sub of Object.keys(subs)) treePaths.push(`${core} › ${sub}`);
}
treePaths.push('תורה ולימוד › פרשת השבוע');
for (const [c, ps] of Object.entries(CHUMASH)) {
  treePaths.push(`תורה ולימוד › פרשת השבוע › ${c}`);
  for (const p of ps) treePaths.push(`תורה ולימוד › פרשת השבוע › ${c} › ${p}`);
}
fs.writeFileSync('docs/topic-taxonomy-tree.json', JSON.stringify({
  treePaths,
  seriesNodes: SERIES_NODES.map(([re, node]) => [re.source, node]),
  shulchanAruch: SHULCHAN_ARUCH,
  chumash: CHUMASH,
  parashaVariants: PARASHA_VARIANTS,
}, null, 1));
console.log('classification:', Object.fromEntries(Object.entries(kindCounts).map(([k, n]) => [KIND_HE[k], n])));
console.log('core nodes:', Object.keys(TREE).map((c) => `${c}:${count(c)}`).join(' | '));
