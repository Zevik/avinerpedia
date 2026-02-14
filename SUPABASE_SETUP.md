# Supabase Migration Setup Guide

## Current Status
✅ **Completed:**
- Database schema SQL created (`scripts/supabase_schema.sql`)
- Migration script created (`scripts/migrate-to-supabase.ts`)
- lib/wiki.ts for reading MDX files
- Supabase client configured

## Next Steps

### Step 1: Execute Database Schema (5 minutes)

Go to Supabase Dashboard SQL Editor:
1. Open: https://app.supabase.com/project/gmxnfgbillsvscqouhke/sql
2. Click "New Query"
3. Copy all content from `scripts/supabase_schema.sql`
4. Paste it into the editor
5. Click "Run"
6. Verify success - you should see:
   - ✅ tables: `posts`, `categories`, `admin_users`
   - ✅ indexes created
   - ✅ RLS policies enabled

### Step 2: Import Existing Content (2-3 minutes)

After schema is created, run migration:

```bash
npx tsx scripts/migrate-to-supabase.ts
```

This will:
- Read all .mdx files from `content/wiki` (~2,800 files)
- Create default categories
- Insert posts with proper relationships
- Show progress in terminal

Expected output:
```
📄 Found 2800 MDX files
📂 Creating default categories...
📤 Uploading posts to Supabase...
✅ 2800 posts uploaded
   ✅ 2750 posts uploaded
   ⚠️ 50 duplicates skipped
```

### Step 3: Verify Data (1 minute)

Go to Supabase Dashboard:
1. Open Table Editor → `posts`
2. Verify you see ~2,800 rows
3. Check a few posts have correct content

### Step 4: Test API (1 minute)

In browser console:
```javascript
// Test fetching posts
const { data } = await supabase
  .from('posts')
  .select('id, title, category_id')
  .limit(5)
```

### Step 5: Set Up Admin Auth (Next Phase)

Once data is migrated:
1. Create authentication system (`/admin/login`)
2. Add user management endpoints
3. Build admin dashboard (`/admin`)
4. Apply RLS permissions for admin role

## Supabase Database Structure

### posts table
```
- id (UUID, primary)
- title (text) - post title
- slug (text, unique) - URL-friendly identifier
- content (text) - full MDX content
- category_id (UUID, foreign key) - links to categories
- author_id (UUID, nullable) - creator user ID
- status (text) - 'published' | 'draft' | 'archived'
- created_at (timestamp)
- updated_at (timestamp)
```

### categories table
```
- id (UUID, primary)
- name (text, unique) - category name (Hebrew)
- slug (text, unique) - URL slug
- description (text, nullable)
- color (text, nullable) - hex color for UI
```

### admin_users table
```
- id (UUID, primary)
- user_id (UUID) - Supabase auth user ID
- role (text) - 'admin' | 'editor'
- created_at (timestamp)
```

## Row Level Security (RLS) Rules

**Everyone can read:**
- ✅ All published posts
- ✅ All categories

**Only admins can write:**
- ✅ Create/edit/delete posts
- ✅ Create/edit/delete categories
- ✅ Manage admin users

## Troubleshooting

### Migration takes too long
- Check terminal for errors
- Verify network connection
- Can be run multiple times (duplicates skipped)

### Some posts fail to import
- Check MDX syntax in `content/wiki`
- Review error messages in terminal
- Can manually fix and re-run

### Slug conflicts
- Caused by duplicate filenames in content/wiki
- Migration automatically skips duplicates
- Review which posts were skipped

## Files Created/Modified

### New Files:
- `scripts/supabase_schema.sql` - Database schema with RLS
- `scripts/migrate-to-supabase.ts` - Content importer script
- `scripts/setup-database.ts` - Alternative setup helper
- `scripts/show-schema-statements.js` - Schema display utility

### Existing Files (Already configured):
- `.env.local` - Supabase credentials
- `lib/supabase.ts` - Supabase client initialization
- `lib/wiki.ts` - MDX file reader

## What's Inside the Schema

1. **UUID Primary Keys** - All tables use UUID for scalability
2. **Indexes** - On slug, category_id, status for fast queries
3. **Foreign Keys** - posts.category_id → categories.id
4. **Timestamps** - Auto-updated created_at, updated_at
5. **RLS Policies** - Row Level Security for data protection
6. **Unique Constraints** - slug must be unique per post

## Next Phase: Admin System

After migration completes:
```
Phase 2:
1. /admin/login - Authentication
2. /admin/dashboard - Main interface
3. /admin/posts - CRUD operations
4. /admin/categories - Category management
5. /admin/users - Admin role management

Phase 3:
1. Update app/*.tsx to query Supabase
2. Remove MDX file system
3. Add search/filter functionality
4. Enable real-time updates
```

---

**🚀 Ready? Execute the schema then run migration script!**
