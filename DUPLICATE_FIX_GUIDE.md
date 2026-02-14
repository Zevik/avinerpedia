# תיקון כפילויות - מדריך ביצוע

## סדר הפעולות

### 1️⃣ הרצת SQL בסופהבייס

פתח את Supabase SQL Editor:
```
https://app.supabase.com/project/gmxnfgbillsvscqouhke/sql
```

העתק והרץ את הקובץ:
```
scripts/cleanup-database.sql
```

זה יעשה:
- ✅ ריקון טבלת `content_items`
- ✅ הוספת UNIQUE constraint על `title`

### 2️⃣ הרצת סקריפט הייבוא

בטרמינל:
```bash
npx tsx scripts/import-from-wiki.ts
```

זה יעשה:
- ✅ קריאת כל קבצי MDX מ-`content/wiki`
- ✅ ייבוא ל-Supabase עם upsert
- ✅ זיהוי אוטומטי של סרטונים

### 3️⃣ אימות

בדוק שהכל תקין:
```bash
npx tsx scripts/check-stats.ts
```

צפוי לראות:
- 📊 ~7,000 רשומות (במקום 24,504)
- 🎥 מספר סרטונים
- ❌ 0 כפילויות

## זמן ביצוע משוער

- SQL: 10 שניות
- ייבוא: 3-5 דקות
- אימות: 5 שניות

**סה"כ: ~5 דקות**
