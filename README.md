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

## סקריפטים נוספים

| סקריפט | תפקיד |
|---|---|
| `scripts/validate-youtube-videos.ts` | בדיקת סרטוני YouTube שהוסרו או הפכו לפרטיים |
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
app/                 # דפים: בית, /videos, /articles, /qa, /series, /search, /french, /content/[id], /admin
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
