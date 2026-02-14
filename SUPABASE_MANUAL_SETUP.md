# הוראות הגדרה ידנית של Supabase 🗄️

## שלב 1: פתיחת SQL Editor בסופהבייס

1. **היכנסו ל-Supabase Dashboard:**
   ```
   https://app.supabase.com/project/gmxnfgbillsvscqouhke/sql
   ```

2. **בחרו "New Query" (שאילתה חדשה)**
   - אם אתם רואים חלון עם SQL Editor, לחצו על **"+"** או **"New Query"**

---

## שלב 2: העתיקו את כל ה-SQL לאדיטור

### צעד 1: יצירת הטבלאות (Tables)
העתיקו את הקוד הבא וְהדביקו ב-SQL Editor:

```sql
-- Create categories table FIRST (referenced by posts)
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  color TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create admin_users table
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  role TEXT DEFAULT 'editor',
  created_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create posts table
CREATE TABLE IF NOT EXISTS posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  content TEXT NOT NULL,
  category_id UUID,
  author_id UUID,
  status TEXT DEFAULT 'published',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (category_id) REFERENCES categories(id),
  FOREIGN KEY (author_id) REFERENCES auth.users(id)
);
```

**לחצו RUN** ✓

---

### צעד 2: יצירת Indexes (למהירות)
העתיקו וך-הדביקו:

```sql
-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_posts_slug ON posts(slug);
CREATE INDEX IF NOT EXISTS idx_posts_category_id ON posts(category_id);
CREATE INDEX IF NOT EXISTS idx_posts_status ON posts(status);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories(slug);
```

**לחצו RUN** ✓

---

### צעד 3: הפעלת RLS (Row Level Security - אבטחה)
העתיקו וך-הדביקו:

```sql
-- Enable RLS (Row Level Security)
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
```

**לחצו RUN** ✓

---

### צעד 4: יצירת Policies (הרשאות)
העתיקו וך-הדביקו:

```sql
-- Policy 1: Everyone can read published posts
CREATE POLICY "Posts are viewable by everyone" ON posts
  FOR SELECT USING (status = 'published');

-- Policy 2: Everyone can read categories
CREATE POLICY "Categories are viewable by everyone" ON categories
  FOR SELECT USING (true);

-- Policy 3: Admins can create posts
CREATE POLICY "Admins can insert posts" ON posts
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
  );

-- Policy 4: Admins can update posts
CREATE POLICY "Admins can update posts" ON posts
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
  );

-- Policy 5: Admins can delete posts
CREATE POLICY "Admins can delete posts" ON posts
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
  );

-- Policy 6: Admins can manage categories
CREATE POLICY "Admins can insert categories" ON categories
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
  );

CREATE POLICY "Admins can update categories" ON categories
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
  );

CREATE POLICY "Admins can delete categories" ON categories
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
  );
```

**לחצו RUN** ✓

---

## שלב 3: אחרי שהכל עבד - בדקו את הטבלאות

1. בחצי הימני של Supabase, לחצו על **"Table Editor"**
2. אתם אמורים לראות:
   - ✅ `categories` table (ריק כרגע)
   - ✅ `posts` table (ריק כרגע)
   - ✅ `admin_users` table (ריק כרגע)

---

## שלב 4: הרצת ה-Migration Script (ייבוא כל התוכן)

כשהטבלאות מוכנות, בחזרה ב-Terminal שלכם בתיקיית הפרויקט:

```bash
npx tsx scripts/migrate-to-supabase.ts
```

זה יעשה:
- ✅ יקרא את כל 2,800+ קבצי MDX
- ✅ ינתח את ה-YAML frontmatter
- ✅ ייצור 4 קטגוריות ברירת מחדל
- ✅ יהכניס את כל הפוסטים לדאטהבייס

---

## שלב 5: יצירת חשבון Admin

1. בעורך - הלכו ל: `http://localhost:3000/admin/login`
   (או אם זה בייצור: `https://avinerpedia.vercel.app/admin/login`)

2. לחצו **"Create New Account"**

3. הזינו:
   - Email: `admin@example.com` (או כל אימייל שתרצו)
   - Password: `password123` (או סיסמה חזקה)

4. לאחר שנוצר החשבון, חזרו לSupabase:
   - **Table Editor** → **admin_users**
   - לחצו **Insert** (הוסיפו שורה חדשה)
   - מלאו:
     - `user_id`: [יהיה צרוך להעתיק מ-auth.users table]
     - `role`: `admin`
   - לחצו **Save**

5. חזרו ל-`/admin/login` ודחקו בכפתור **Sign In**

---

## ✅ זה הכל!

כשהכל מוכן:
- 📊 תוכלו לראות את כל הפוסטים בדאטהבייס
- 🔐 תוכלו להתחבר כמנהל
- 📝 תוכלו להוסיף/ערוך/למחוק פוסטים
- 🎯 האתר יציג את כל התוכן מהדאטהבייס

---

## 🔧 עדכון: צעדים בסדר הנכון

**זה הסדר שצריך לעשות:**

1. **צעד 1:** הריצו את כל קודי ה-SQL בסופהבייס (4 חלקים)
2. **צעד 2:** בדקו שהטבלאות נוצרו ב-Table Editor
3. **צעד 3:** הריצו `npx tsx scripts/migrate-to-supabase.ts`
4. **צעד 4:** בדקו שהפוסטים הכנסו (אמור להיות ~2,800)
5. **צעד 5:** יצרתם חשבון admin ב-`/admin/login`
6. **צעד 6:** אישרתם את החשבון ב-admin_users table

🎉 מוגמר!
