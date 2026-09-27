# אבינרפדיה - Avinerpedia

ארכיון תוכן יהודי מקיף עם אלפי סרטונים, מאמרים, שאלות ותשובות וסדרות לימוד מאת הרב שלמה אבינר שליט״א.

אתר חי: [avinerpedia.vercel.app](https://avinerpedia.vercel.app)

## טכנולוגיות

- **Framework**: Next.js 15 (App Router), TypeScript
- **Database**: Supabase (PostgreSQL, Full-Text Search, RLS)
- **Styling**: Tailwind CSS, Lucide React
- **Tests**: Vitest (יחידה), Playwright (דפדפן, דסקטופ + מובייל)
- **Hosting**: Vercel (פריסה אוטומטית מכל push ל-`main`)

## התקנה

### 1. תלויות

```bash
npm install
```

### 2. משתני סביבה

צור קובץ `.env.local` (לא נכנס ל-git):

```bash
NEXT_PUBLIC_SUPABASE_URL=https://oufpplkyijyloacrdrgq.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...   # לסקריפטים בלבד, לעולם לא בדפדפן
```

הערכים ב-Supabase: Project Settings → API.

### 3. מסד הנתונים

> **חשבון Supabase של הפרויקט:** `zevik.contact@gmail.com`
> Project ID: `oufpplkyijyloacrdrgq` ([דשבורד](https://supabase.com/dashboard/project/oufpplkyijyloacrdrgq))

בעורך ה-SQL של Supabase, לפי הסדר:

1. [`supabase/schema.sql`](supabase/schema.sql) — טבלאות `content_items`, `categories`, `admin_users`, אינדקסים ו-RLS.
2. [`supabase/migrations/002_taxonomy.sql`](supabase/migrations/002_taxonomy.sql) — עץ נושאים (`topics`, `topic_parents`, `content_topics`) וסדרות (`series`).

### 4. שרת פיתוח

```bash
npm run dev
```

## טעינת תוכן

התוכן מגיע מהוויקי המקורי (shlomo-aviner.net, MediaWiki) בשני שלבים:

**א. תוכן** — קובצי ה-MDX ב-`content/wiki/`:

```bash
npx tsx scripts/import-from-wiki.ts
```

**ב. העשרה** — סוג תוכן, נושאים, סדרות וסדר פרקים, וידאו ותאריכים, מתוך dump ה-SQL וייצוא ה-XML של הוויקי. קובצי המקור נשמרים ב-`support/` (לא נכנס ל-git: ה-dump כולל את טבלת המשתמשים של הוויקי).

```bash
node scripts/source/extract-mediawiki-dump.mjs   # support/localhost.sql → support/derived/*.json
node scripts/source/extract-mediawiki-xml.mjs    # support/avinerpedia.xml → support/derived/xml_pages.json
node scripts/source/build-taxonomy.mjs           # → support/derived/taxonomy.json
node scripts/source/plan-enrichment.mjs          # התאמה ל-content_items (קריאה בלבד)
node scripts/source/apply-enrichment.mjs         # הרצה יבשה
node scripts/source/apply-enrichment.mjs --apply # גיבוי ל-support/derived/backup/ ואז כתיבה
```

ואז בעורך ה-SQL:

```sql
select * from public.sync_content_categories();
```

> ⚠️ `import-from-wiki.ts` דורס את `main_category` / `sub_category` בסיווג הישן. אם מריצים אותו שוב, יש להריץ מיד אחריו את שלב ההעשרה.

## ארגון הנתונים: נושאים ותגיות

> המספרים נכונים ל-27.9.2026. הפירוט הטכני המלא נמצא ב-[CLAUDE.md](CLAUDE.md).

### שתי שכבות של נושאים ב-Supabase

#### שכבה 1: העץ המאוצר (משמש לסינון ולניווט באתר)

**`filter_nodes`**: צמתי העץ, 190 בסך הכול.

| שדה | משמעות |
|---|---|
| `id` | מזהה (מופיע בכתובת: `?topic=<id>`) |
| `name` | שם הצומת ("חנוכה") |
| `path` | הנתיב המלא, ייחודי ("חגים ומועדים › חנוכה › הלכות חנוכה") |
| `parent_id` | ההורה (הורה אחד בלבד; ריק בנושא ליבה) |
| `depth` | 0 = נושא ליבה, 1, 2, 3 |
| `sort_order` | הסדר בתוך ההורה (ידני, לא אלפביתי) |

**`content_filter_nodes`** (`content_id`, `node_id`): הקישור בין פריטים לצמתים, 20,579 שורות. כל פריט מקושר לצומת שלו **וגם לכל האבות שלו**. לכן סינון לפי "הלכה" מחזיר גם את כל מה שמתחתיה, בשאילתה אחת.

**`filter_node_counts`** (`node_id`, `main_category`, `item_count`): מונים שמחושבים מראש לכל צומת, לפי סוג תוכן, ו-`__has_video` לסרטונים.

**בטבלה `content_items`:**
- `primary_node_id`: הנושא העיקרי של הפריט.
- `sub_category`: שם הצומת הספציפי, כטקסט.
- `topics_manual`: מסמן שהנושאים נקבעו ידנית בטופס הניהול, והסקריפטים לא דורסים אותם.

**צומת עם שני הורים** נשמר כשני צמתים נפרדים באותו שם. למשל "שמירת הלשון" נמצא גם תחת "מוסר ומידות" וגם תחת "הלכה › בין אדם לחברו".

#### שכבה 2: הנושאים הגולמיים מהוויקי הישן (נשמרים, לא מוצגים)

**`topics`** (`id`, `name`, `depth`, `item_count`): 906 קטגוריות כפי שהיו בוויקי, כולל שגיאות כתיב, שאלות בודדות ונתיבים משורשרים.

**`topic_parents`** (`topic_id`, `parent_id`): לנושא יכולים להיות כמה הורים (825 קשרים), לכן זו טבלת קישור. העומק מגיע עד 4.

**`content_topics`** (`content_id`, `topic_id`, `is_primary`): 12,296 קישורים.

השכבה הזו משמשת רק כמקור. הקובץ `docs/topic-taxonomy-mapping.csv` ממפה כל נושא גולמי לצומת בעץ המאוצר, והסקריפט `apply-topic-taxonomy.mjs` בונה ממנה את `content_filter_nodes`. **היא לא מוצגת לגולשים.**

### תגיות

**`content_items.original_tags`**: שדה טקסט חופשי בתוך הפריט, בלי טבלה נפרדת. רק 149 פריטים פעילים מתוך 7,118 מכילים תגיות, ורובן שאלות ספציפיות ("הדלקת נרות בבית הכנסת ודינים נוספים"). הן מוצגות בתחתית דף התוכן כקישורים לחיפוש.

### צירים נוספים (שטוחים, בלי היררכיה)

- **מקור:** הטבלה `sources` והשדה `content_items.source_id` (עטרת ירושלים, מכון מאיר, שו"ת סמס...).
- **חלק בשולחן ערוך**, בשו"ת בלבד: `content_items.sa_section`.
- **סדרות:** הטבלה `series` והשדות `content_items.series_id` ו-`series_order`.
- **ישן, בשימוש שולי:** הטבלה `categories` (ראשי ומשני, 2 רמות), שנבנית מ-`sub_category`.

### כמה רמות ה-UI מציג

**הנתונים כרגע: 4 רמות (עומק 0 עד 3).**

| עומק | צמתים | דוגמה |
|---|---|---|
| 0 | 11 | תורה ולימוד |
| 1 | 87 | פרשת השבוע / חיי זוגיות |
| 2 | 38 | בראשית / הלכות חנוכה / עבודת הזוגיות |
| 3 | 54 | חיי שרה |

הרמה הרביעית קיימת כמעט רק בפרשות השבוע: נושא › פרשת השבוע › חומש › פרשה.

| מקום | רמות |
|---|---|
| **סינון הנושאים בספרייה** (`/library`, `/videos`, `/qa`...) | **כל הרמות.** עץ נפתח וסגור שבנוי ברקורסיה, בלי הגבלת עומק, עם חיפוש בתוך העץ |
| **עמוד הנושאים** (`/topics`) | **2 רמות:** 11 נושאי ליבה, ומתחת לכל אחד עד 8 תתי-נושאים. אם יש יותר, מופיע קישור "כל X תתי-הנושאים" |
| **עמוד נושא** (`/topics/חגים ומועדים/חנוכה`) | הצומת הנוכחי, פירורי לחם מלמעלה, וה**ילדים הישירים** שלו. אפשר לרדת עד הרמה הרביעית, רמה אחת בכל פעם |
| **טופס הניהול** (בחירת נושאים לפריט) | **כל הרמות**, עץ רקורסיבי עם תיבות סימון וחיפוש |
| **תחתית דף תוכן** | הצמתים של הפריט (הספציפי ביותר קודם) והתגיות |
| **תפריט הניווט העליון** | אין בו נושאים. יש רק קישור אחד, "נושאים" |

הסינון וטופס הניהול תומכים בכל עומק, כך שרמה חדשה מופיעה בהם אוטומטית. רק עמוד `/topics` הראשי מוגבל בכוונה ל-2 רמות, כדי שיישאר קריא.

### איך משנים את העץ

1. עורכים את `scripts/source/draft-topic-taxonomy.mjs`:
   - `TREE`: נושאי הליבה ותתי-הנושאים, ולכל אחד הנושאים הגולמיים שנכנסים אליו.
   - `THIRD_LEVEL`: נושא גולמי שמקבל צומת משלו ברמה שלישית, במקום להתמזג בתת-הנושא (למשל `עם ישראל`).
   - `EXTRA_NODES`: נושא שמופיע תחת שני הורים.
2. `node scripts/source/draft-topic-taxonomy.mjs`: מייצר מחדש את `docs/topic-taxonomy-mapping.csv`, את `docs/topic-taxonomy-tree.json` ואת הטיוטה.
3. `node scripts/source/apply-topic-taxonomy.mjs`: הרצה יבשה עם סיכום. אחריה `--apply`, שמגבה ואז כותב. צמתים קיימים שומרים על ה-id שלהם, כי ההתאמה היא לפי `path`.
4. `npx tsx scripts/source/build-legacy-redirects.ts`: מעדכן את ההפניות מכתובות הקטגוריות הישנות.
5. `npm run revalidate`: מנקה את המטמון של האתר החי.
6. בעורך ה-SQL: `select * from public.sync_content_categories();`, כי `sub_category` השתנה.

לשינוי **שם** של צומת קיים יש קודם להריץ את `scripts/source/rename-filter-node.mjs`, כדי שה-id והקישורים יישמרו.

## סקריפטים נוספים

| סקריפט | תפקיד |
|---|---|
| `scripts/check-dead-videos.mjs` | בדיקת סרטוני YouTube שהוסרו/פרטיים: החלפה לסרטון חלופי, הסרת הנגן מפריטים עם טקסט, והסתרת פריטים שאין בהם דבר מלבד קישור מת (`--apply` לכתיבה, עם גיבוי) |
| `scripts/source/build-legacy-redirects.ts` | בניית מפת ההפניות (301) מכתובות הוויקי הישן לכתובות החדשות (`lib/legacy-redirects.json`); להריץ עם `npx tsx` אחרי כל שינוי בפריטים פעילים |
| `scripts/push-vercel-env.mjs` | העברת משתני Supabase מ-`.env.local` ל-Vercel (אחרי `npx vercel link --project avinerpedia`) |

## בדיקות

```bash
npm run typecheck   # TypeScript
npm test            # בדיקות יחידה (תקינות content/wiki)
npm run test:e2e    # בדיקות דפדפן לכל הדפים, דסקטופ + מובייל
npm run test:all    # הכל
```

## מבנה הפרויקט

```
app/                 # דפים: בית, /library, /videos, /articles, /qa, /series, /topics, /content/[id], /about, /rav-aviner, /accessibility, /privacy, /admin
components/          # קומפוננטות React
lib/                 # db.ts (שאילתות), supabase.ts, types.ts, video.ts
content/wiki/        # קובצי MDX שיוצאו מהוויקי המקורי
scripts/source/      # צנרת ההעשרה מהוויקי המקורי
supabase/            # סכמה ומיגרציות
tests/               # unit/ (Vitest), e2e/ (Playwright)
```

## רישיון

© 2025 אבינרפדיה. כל הזכויות שמורות.
התוכן מאת הרב שלמה אבינר שליט״א.
