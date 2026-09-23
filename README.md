# אבינרפדיה - Avinerpedia

ארכיון תוכן יהודי מקיף עם אלפי סרטונים, מאמרים, שאלות ותשובות וסדרות לימוד מאת הרב שלמה אבינר שליט״א.

## תכונות עיקריות

- ✅ **ממשק RTL מלא בעברית** - תמיכה מלאה בכיווניות מימין לשמאל
- ✅ **4 סוגי תוכן** - סרטונים, מאמרים, שו"ת הלכה, וסדרות לימוד
- ✅ **חיפוש מתקדם** - חיפוש טקסט מלא באמצעות PostgreSQL FTS
- ✅ **סינון דינמי** - סינון לפי נושאים וקטגוריות משנה
- ✅ **עיצוב רספונסיבי** - מותאם למובייל, טאבלט ודסקטופ
- ✅ **טעינה מהירה** - Server Components של Next.js 15
- ✅ **נגן יוטיוב משולב** - צפייה ישירה בסרטונים

## טכנולוגיות

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript (Strict Mode)
- **Database**: Supabase (PostgreSQL)
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Markdown**: react-markdown + remark-gfm

## התקנה

### 1. התקן תלויות

```bash
cd avinerpedia
npm install
```

### 2. הגדר Supabase

> **חשבון Supabase של הפרויקט:** `zevik.contact@gmail.com`
> Project ID: `oufpplkyijyloacrdrgq` ([דשבורד](https://supabase.com/dashboard/project/oufpplkyijyloacrdrgq))

1. הרץ את [`supabase/schema.sql`](supabase/schema.sql) בעורך ה-SQL (על סכמת `public` ריקה).
2. ייבא את התוכן: `npx tsx scripts/import-from-wiki.ts`
3. קשר קטגוריות ובטל פריטים ריקים (בעורך ה-SQL): `select * from public.sync_content_categories();`

### 3. הגדר משתני סביבה

צור קובץ `.env.local` בתיקיית הפרויקט:

```bash
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

קבל את הערכים מ-Settings > API בפרויקט Supabase שלך.

### 4. טען נתונים למסד הנתונים

הסקריפט קורא את הקובץ `../full_database.csv` ומעלה אותו ל-Supabase:

```bash
npm run seed
```

תהליך זה יכול לקחת מספר דקות (162,970 שורות).

### 5. הפעל את שרת הפיתוח

```bash
npm run dev
```

פתח את [http://localhost:3000](http://localhost:3000) בדפדפן.

## מבנה הפרויקט

```
avinerpedia/
├── app/                      # Next.js App Router
│   ├── layout.tsx           # Layout ראשי עם RTL
│   ├── page.tsx             # דף הבית (4 פסים)
│   ├── content/[id]/        # דף תוכן דינמי
│   ├── videos/              # דף סרטונים + סינון
│   ├── articles/            # דף מאמרים + סינון
│   ├── qa/                  # דף שו"ת + סינון
│   ├── series/              # דף סדרות + סינון
│   ├── search/              # דף חיפוש
│   └── globals.css          # עיצוב גלובלי + RTL
├── components/              # קומפוננטות React
│   ├── Navbar.tsx           # תפריט ניווט עליון
│   ├── VideoCard.tsx        # כרטיס סרטון
│   ├── VideoCarousel.tsx    # קרוסלה אופקית
│   ├── SeriesCard.tsx       # כרטיס סדרה
│   ├── QAListItem.tsx       # פריט שו"ת
│   ├── ContentRenderer.tsx  # רנדור Markdown
│   └── FilterSidebar.tsx    # סרגל סינון
├── lib/                     # Utilities
│   ├── types.ts             # TypeScript types
│   ├── supabase.ts          # Supabase client
│   └── db.ts                # Database queries
├── scripts/
│   └── seed.ts              # סקריפט העלאת CSV
└── public/                  # קבצים סטטיים
```

## תכונות מתקדמות

### מיפוי CSV למסד נתונים

הסקריפט `scripts/seed.ts` מבצע:

- ✅ **ניקוי נתונים** - מסיר גרש בודד (`'`) מתחילת השדות
- ✅ **המרת תאריכים** - המרה לפורמט ISO
- ✅ **העלאה באצווה** - העלאה ב-100 רשומות בכל פעם
- ✅ **טיפול בשגיאות** - דיווח מפורט על שגיאות

### עיצוב רספונסיבי

- **Mobile**: תצוגה חד-עמודית
- **Tablet**: תצוגת גריד 2 עמודות
- **Desktop**: תצוגת גריד 3-4 עמודות
- **RTL Support**: כל האתר מכוון מימין לשמאל

### SEO ו-Performance

- Server Components לטעינה מהירה
- Image Optimization (next/image)
- Metadata דינמי לכל דף
- Lazy Loading לתמונות וסרטונים

## פקודות NPM

```bash
npm run dev      # הפעלת שרת פיתוח
npm run build    # בניית production
npm run start    # הפעלת production
npm run lint     # בדיקת קוד
npm run seed     # העלאת CSV למסד נתונים
```

## הגדרת Supabase

להפעלת Row Level Security (RLS), הרץ את הפקודות הבאות בעורך SQL:

```sql
-- Enable RLS
ALTER TABLE content_items ENABLE ROW LEVEL SECURITY;

-- Allow public read access
CREATE POLICY "Allow public read access"
ON content_items FOR SELECT
USING (true);

-- Create indexes for performance
CREATE INDEX idx_main_category ON content_items(main_category);
CREATE INDEX idx_sub_category ON content_items(sub_category);
CREATE INDEX idx_fts ON content_items USING GIN (fts);
```

## דפי האתר

1. **דף הבית** (`/`) - 4 פסים:
   - Hero - מאמר מומלץ
   - Video Carousel - סרטונים אחרונים
   - Series Grid - סדרות לימוד
   - Q&A List - שאלות ותשובות

2. **דף תוכן** (`/content/[id]`) - תצוגה דינמית:
   - סרטונים - נגן YouTube + תיאור
   - שו"ת - סגנון צ'אט (שאלה/תשובה)
   - מאמרים - סגנון בלוג נקי

3. **דפי סינון**:
   - `/videos` - גריד סרטונים + סרגל נושאים
   - `/articles` - רשימת מאמרים + סרגל נושאים
   - `/qa` - רשימת שו"ת + סרגל נושאים
   - `/series` - רשימת סדרות + סרגל נושאים

4. **דף חיפוש** (`/search?q=...`) - חיפוש טקסט מלא

## פריסה (Deployment)

### Vercel (מומלץ)

```bash
npm install -g vercel
vercel login
vercel
```

הוסף משתני סביבה בממשק Vercel:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## תמיכה

לשאלות או בעיות, צור Issue ב-GitHub או צור קשר עם המפתח.

## רישיון

© 2025 אבינרפדיא. כל הזכויות שמורות.
התוכן מאת הרב שלמה אבינר שליט״א.
