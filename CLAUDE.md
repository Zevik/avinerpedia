# CLAUDE.md — Avinerpedia

Guidance for anyone (human or Claude) working on this repository. Keep it current: when a fact here changes, update this file in the same commit.

## Project overview

Avinerpedia is a Hebrew (RTL) archive of Rabbi Shlomo Aviner's teaching: ~7,500 articles, videos, Q&A pages and ordered lesson series, originally published on a MediaWiki site (shlomo-aviner.net). The content was exported to MDX, loaded into Supabase, and enriched with the source wiki's taxonomy (types, topics, series).

- Live: https://avinerpedia.vercel.app
- Repo: `github.com/Zevik/avinerpedia` (the only relevant remote; ignore the old `aviner-pedia-2`)
- Supabase project: `oufpplkyijyloacrdrgq`, account `zevik.contact@gmail.com`
- Vercel project: `avinerpedia` (team `zeviks-projects`); every push to `main` deploys to production

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 15 (App Router, React 19, Server Components), TypeScript |
| Data | Supabase Postgres + RLS, `@supabase/supabase-js`, `@supabase/auth-helpers-nextjs` (admin auth) |
| Styling | Tailwind CSS 3 + `@tailwindcss/typography`, `lucide-react` icons, Heebo font |
| Content rendering | `react-markdown` + `remark-gfm` + `rehype-raw` (`components/ContentRenderer.tsx`) |
| Tests | Vitest (unit), Playwright (E2E, desktop + Pixel 7) |
| Hosting | Vercel |

## Key commands

```bash
npm run dev          # local dev server on :3000
npm run build        # production build (also type-checks)
npm run typecheck    # tsc --noEmit
npm test             # Vitest: validates content/wiki (every file parses, has a title)
npm run test:e2e     # Playwright: all public pages, series/topic flows, admin guards
npm run test:all     # typecheck + unit + e2e — run before every commit
```

Playwright starts `npm run dev` itself (or reuses a running server). `E2E_PROD=1` runs against `npm run start` instead (build first). Output goes to `playwright-report/` and `test-results/` (gitignored).

## Environment variables

`.env.local` (gitignored; never commit or print its values):

| Variable | Where | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | app + scripts | `https://oufpplkyijyloacrdrgq.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | app + scripts | Public by design; RLS protects the data. Must keep the `NEXT_PUBLIC_` prefix — browser code needs it, and the build fails without it |
| `SUPABASE_SERVICE_ROLE_KEY` | scripts only | Bypasses RLS. Never expose to the browser, never prefix with `NEXT_PUBLIC_` |

**Vercel** needs the same three: the two public ones as *Config* in Production/Preview/Development, the service key as *Secret* in Production/Preview (Vercel does not allow Secrets in Development). A missing `NEXT_PUBLIC_SUPABASE_ANON_KEY` fails the build at `/admin/login` prerender. `scripts/push-vercel-env.mjs` pushes them from `.env.local` and verifies with `vercel env ls`; setting them by hand in the dashboard also works. The Vercel MCP connector cannot read or write env vars (403).

## Database architecture

Schema lives in `supabase/` and is applied by hand in the Supabase SQL Editor (there is no migration runner):

1. `supabase/schema.sql` — base tables, indexes, RLS, functions (run once on an empty `public` schema)
2. `supabase/migrations/002_taxonomy.sql` — topics, series and their links (idempotent)

### Tables

- **`content_items`** — one row per page. Columns: `id`, `title` (unique; the import upserts on it), `main_category` (text the pages filter on: `סרטונים` / `מאמרים` / `שו"ת הלכה` / `סדרות` / `Cours en Français`), `sub_category` (specific topic or series name), `main_category_id` / `sub_category_id` (→ `categories`), `video_id`, `publish_date`, `summary`, `content_md`, `original_tags`, `is_active`, `created_at`, `updated_at` (trigger), `fts` (generated tsvector). Taxonomy columns from 002: `source_page_id` (unique, source wiki page id), `content_type` (`video|article|qa|series|french`), `root_topic`, `series_id` (→ `series`), `series_order`, `source_updated_at`.
- **`categories`** — legacy two-level filter model: 4 `main` rows + `sub` rows (parent = main). Drives the filter sidebars on `/videos`, `/articles`, `/qa`. Rebuilt from `content_items.sub_category` by `sync_content_categories()`.
- **`topics`**, **`topic_parents`** — the unified topic tree. A topic can have several parents (e.g. עם ישראל under both אמונה and מדינת ישראל), so parents are a join table, not a column. `depth` 0 = root; `item_count` = items tagged directly.
- **`content_topics`** — item ↔ topic links, `is_primary` marks the most specific topic.
- **`series`** — `name`, `detected_by` (`category` / `title_pattern` / `category+title` / `title_prefix`), `episode_count`.
- **`admin_users`** — `user_id` (→ `auth.users`), `role` (`admin` / `editor`).

There are no views.

### RLS

Every table has RLS on. Anyone can `select`; writes require `public.is_admin()` (a `security definer` function: `auth.uid()` is in `admin_users`). `admin_users` rows are readable only by their own user. The service role key (scripts) bypasses RLS.

### Search

`content_items.fts` is a generated weighted tsvector (`simple` config): title A, summary B, content C, with a GIN index. `searchContent()` in `lib/db.ts` uses `textSearch('fts', q, { type: 'websearch', config: 'simple' })`. Title `ilike` searches (`/api/search`, filters) use the `pg_trgm` GIN index on `title`.

### Functions

- `sync_content_categories()` — links `main_category_id`/`sub_category_id`, creates sub-categories for new `sub_category` values, deletes unused ones, and deactivates items with neither text nor video. **Times out via the REST API (8s limit); run it in the SQL Editor.**
- `is_admin()`, `touch_updated_at()` (trigger).

## Taxonomy and navigation model

The source wiki had three parallel category trees — `X (וידאו)`, `X (מאמרים)`, `X (שו"ת)` — plus series categories. They are merged into one model:

- **Content type** (`content_type` → `main_category`): from the source's type categories (`וידאו`, `מאמר`, `שו"ת`), title suffixes, templates (`{{video}}`, `{{שות}}`) and embedded videos. Priority: french > series > qa > video > article.
- **Topics**: every subject category with the type suffix stripped (`אמונה (וידאו)` → `אמונה`), `חגים` merged into `מועדים`. 11 main roots (הלכה, מדינת ישראל, אמונה, מיוחדים, תורה, מוסר ומידות, שיעורים מישיבת עטרת ירושלים, חינוך, זוגיות ומשפחה, מועדים, תפילה) plus Shulchan Aruch sections for Q&A.
- **Series**: 24 series, 597 episodes. `series_order` comes from the numbers in titles — `(12)` and Hebrew numerals by gematria (`סעיף רטו` < `סעיף ריז`). Series are detected from categories and from numbered titles, with spelling-insensitive matching.

UI:

| Route | Shows |
|---|---|
| `/series` | All series (from `series`) |
| `/series/[id]` | Episodes by `series_order` |
| `/content/[id]` | Item; `SeriesNav` (episode N of M, prev/next) if it has `series_id`; `TopicChips` at the bottom |
| `/topics` | Root topics with sub-topic chips; standalone topics below |
| `/topics/[id]` | Breadcrumb, sub-topics with totals, paginated tagged items. `?from=<parentId>` picks which parent the breadcrumb follows |
| `/videos`, `/articles`, `/qa` | Filter by `main_category` + `sub_category` (legacy `categories` model) |

Queries for the taxonomy live in `lib/taxonomy.ts`; the rest in `lib/db.ts`.

## Content and data pipeline

1. **Content**: `content/wiki/*.mdx` (7,863 files exported from the wiki) → `npx tsx scripts/import-from-wiki.ts` → `content_items`.
2. **Enrichment** from the wiki's SQL dump and XML export in `support/` (gitignored — the dump contains the wiki's user table):
   ```bash
   node scripts/source/extract-mediawiki-dump.mjs    # → support/derived/*.json
   node scripts/source/extract-mediawiki-xml.mjs     # → support/derived/xml_pages.json
   node scripts/source/build-taxonomy.mjs            # → support/derived/taxonomy.json
   node scripts/source/plan-enrichment.mjs           # read-only match to content_items
   node scripts/source/apply-enrichment.mjs          # dry run
   node scripts/source/apply-enrichment.mjs --apply  # backup to support/derived/backup/, then write
   ```
   Then run `select * from public.sync_content_categories();` in the SQL Editor.

Gotchas:
- **`import-from-wiki.ts` overwrites `main_category`/`sub_category` with old heuristics** (it put 1,745 articles into Q&A because their text contained `ש:`). Re-run the enrichment right after any re-import.
- The dump's `categorylinks` table is **stale** for ~2,000 pages bot-edited in March 2026 (the wiki's job queue never ran); `build-taxonomy` merges in categories parsed from the latest wikitext.
- 371 DB items are source-wiki redirects (aliases); they are `is_active = false`.
- Category names in the source are sometimes HTML-entity-encoded, even doubly (`&amp;quot;`), and use `''` for `"`; normalize before comparing.
- The source site is behind Cloudflare bot protection; use the dump/XML export rather than crawling.

## Conventions and gotchas

- **RTL Hebrew**: `<html lang="he" dir="rtl">` in `app/layout.tsx`. Use `space-x-reverse` with `space-x-*`, `ArrowLeft` for "forward", `ArrowRight` for "back".
- **Content HTML**: imported content contains raw HTML and wiki tags. `ContentRenderer` renders `<youtube>` and Machon Meir tags (`<machonMeeir>`, `…FR|IL|EN|France>`) as embeds; any unknown lowercase tag makes React log "tag is unrecognized" (the E2E tests fail on console errors). Raw `class=`/`frameborder=` attributes need React spellings if content is compiled as MDX.
- **Video ids**: YouTube id, `Meir:<id>` (meirtv/Vimeo, resolved by `lib/video.ts`), or `Maale:<path>`. Many YouTube thumbnails 404 because videos were removed; tests ignore image failures.
- **404s under streaming**: `app/loading.tsx` makes Next stream, so `notFound()` returns HTTP 200 with the not-found page and a `noindex` meta tag. Test for the meta tag, not the status.
- **Supabase clients**: `lib/supabase.ts` exports one `supabase` — plain anon client on the server, cookie-based auth-helpers client in the browser (carries the admin session so `is_admin()` writes pass). A HEAD/`count` request returns success even for a missing table; probe with a real `select`.
- **Line endings**: files are CRLF on Windows; scripted find/replace must account for `\r\n` (prefer the Edit tool).
- **Git**: commit after each verified change and push to `origin main` right away (triggers a Vercel deploy). Check the deployment status every ~20 seconds, not faster.

## Admin (`/admin`)

- `middleware.ts` redirects every `/admin/*` page except `/admin/login` to the login page unless the session user is in `admin_users`.
- Login is email/password (Supabase Auth). Public sign-up was removed; admins are created by hand:
  1. Supabase → Authentication → Users → Add user (email + password, auto-confirm).
  2. SQL Editor: `insert into public.admin_users (user_id, role) select id, 'admin' from auth.users where email = '<email>';`
  3. Also turn off public sign-ups: Authentication → Sign In / Providers → Email → disable "Allow new users to sign up".
- Pages: dashboard (counts), content list (filter, change main/sub category), content edit (title, date, summary, body or video id, tags, active), categories (legacy `categories` tree: create/rename/delete/merge).

## Roadmap / pending

- **Admin taxonomy editing** (next): content type selector, series + episode number, topic multi-select in the edit form (keeping `main_category`/`sub_category` in sync); replace the legacy categories screen with topic-tree and series management.
- **Content refresh**: 2,045 pages were edited on the source after the MDX export (2026-02-14), and 246 items are empty in the DB though the source has text. Needs a wikitext → Markdown conversion from `support/avinerpedia.xml`.
- **Individual Q&A**: 9,645 `{{שות|כותרת=|שאלה=|תשובה=}}` blocks could become separately searchable records.
- **Missing pages**: 6 source pages (titles with `\`) are not in the DB.
- **YouTube validation**: run `scripts/validate-youtube-videos.ts` to find removed/private videos (source of the thumbnail 404s).
- **Cleanups**: `/wiki` (an older all-content listing via `getWikiPosts`, not linked from the navbar) and `/admin/posts` (a redirect to `/admin/content`) are leftovers; `getSeriesGroups` in `lib/db.ts` is unused; the `next-mdx-remote` dependency is unused (`gray-matter` is still used by the import script and unit tests); `@supabase/auth-helpers-nextjs` is deprecated in favor of `@supabase/ssr`.
