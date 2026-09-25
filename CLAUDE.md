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
npm run revalidate   # purge the cached live site after a script wrote to the DB
```

Playwright starts `npm run dev` itself (or reuses a running server). `E2E_PROD=1` runs against `npm run start` instead (build first; locally on Windows, prefetched `/series/[id]` client navigations can stall). **`E2E_BASE_URL=https://avinerpedia.vercel.app npm run test:e2e` runs the suite against the deployed site** — the best post-deploy check. It uses 2 workers: full parallelism floods the live site with prefetches (cold functions) and navigations time out; in normal use they take 0.2–2 s. Output goes to `playwright-report/` and `test-results/` (gitignored).

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
3. `supabase/migrations/003_filter_tree.sql` — the curated filter tree (idempotent)

### Tables

- **`content_items`** — one row per page. Columns: `id`, `title` (unique; the import upserts on it), `main_category` (text the pages filter on: `סרטונים` / `מאמרים` / `שו"ת הלכה` / `סדרות` / `Cours en Français`), `sub_category` (specific topic or series name), `main_category_id` / `sub_category_id` (→ `categories`), `video_id`, `publish_date`, `summary`, `content_md`, `original_tags`, `is_active`, `created_at`, `updated_at` (trigger), `fts` (generated tsvector). Taxonomy columns from 002: `source_page_id` (unique, source wiki page id), `content_type` (`video|article|qa|series|french`), `root_topic`, `series_id` (→ `series`), `series_order`, `source_updated_at`.
- **`categories`** — legacy two-level filter model: 4 `main` rows + `sub` rows (parent = main). Drives the filter sidebars on `/videos`, `/articles`, `/qa`. Rebuilt from `content_items.sub_category` by `sync_content_categories()`.
- **`topics`**, **`topic_parents`** — the unified topic tree. A topic can have several parents (e.g. עם ישראל under both אמונה and מדינת ישראל), so parents are a join table, not a column. `depth` 0 = root; `item_count` = items tagged directly.
- **`content_topics`** — item ↔ topic links, `is_primary` marks the most specific topic.
- **`series`** — `name`, `detected_by` (`category` / `title_pattern` / `category+title` / `title_prefix`), `episode_count`.
- **`admin_users`** — `user_id` (→ `auth.users`), `role` (`admin` / `editor`).
- **`filter_nodes`** (003) — the curated filter tree: `path` ("מועדים › חנוכה › הלכות חנוכה"), `parent_id`, `depth`, `sort_order`. **`content_filter_nodes`** links each item to its nodes *and their ancestors* (so a core topic matches everything beneath it). **`filter_node_counts`** holds active-item counts per node per page (`main_category`, or `__has_video` for /videos). `content_items` gained `primary_node_id`, `sa_section` (Shulchan Aruch section, Q&A axis) and `source_collection` (e.g. ישיבת עטרת ירושלים — a source, not a topic).

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
| `/content/[id]` | Item; `SeriesNav` (episode N of M, prev/next) if it has `series_id`; `TopicChips` at the bottom: curated nodes (most specific, primary first) and the item's question-tags (`original_tags`, linking to search) |
| `/topics` | The 11 core topics of the curated tree, with sub-topic chips |
| `/topics/[...path]` | Name-based URL of a curated node (`/topics/מועדים/חנוכה`, built by `nodeHref()`): breadcrumb, sub-topics with counts, paginated items (node + descendants). Old numeric `/topics/<id>` URLs (pre-curated topics) 301 to the node via `next.config.ts` redirects from `lib/topic-redirects.json` |
| `/videos`, `/articles`, `/qa` | `FilteredContentPage` + `TopicFilter`: curated tree with counts, search inside the filter, drawer on mobile; `?topic=<node id>` (old `?topic=<name>` links resolve by name); `/qa` adds Shulchan Aruch chips (`?sa=`). `/videos` (and the home page's video row) excludes series episodes (`exclude_series`: `series_id is null`, 593 items) — they live on `/series`; the `__has_video` counts follow the same rule |

Queries for the taxonomy live in `lib/taxonomy.ts`, for the filter tree in `lib/filters.ts`; the rest in `lib/db.ts`.

### Curated filter tree (topics for filtering)

The raw 914 `topics` (many are single questions, typos, concatenated paths) stay as tags; filtering uses the curated tree designed in `docs/TOPIC_TAXONOMY_DRAFT.md`: 11 core topics (הלכה, חגים ומועדים, אמונה, תורה ולימוד, תפילה, מדינת ישראל וצה"ל, אקטואליה ותרבות, מוסר ומידות, זוגיות ומשפחה, חינוך, אישים) → sub-topics → a third level ("הלכות X", or פרשת השבוע › חומש › פרשה). Series are their own entity; sources (ישיבת עטרת ירושלים, שו"ת סמס...) are `source_collection` metadata.

- **`docs/topic-taxonomy-mapping.csv` is the editable source of truth** (one row per source topic → node). Regenerate the draft with `node scripts/source/draft-topic-taxonomy.mjs` (tree definition inside), then apply with `node scripts/source/apply-topic-taxonomy.mjs` (dry run; `--show-title` lists title-based guesses) and `--apply` (backup first; rewrites links, counts, `sub_category` = curated leaf name). Items get nodes from their topics, else their series, else strict title keywords (parashot only as "פרשת X" / "X ע\"ה"), else Q&A → הלכה; ~97% coverage.
- After an apply, run `select * from public.sync_content_categories();` in the SQL Editor (legacy `categories` follow `sub_category`).
- **A topic filed under two parents**: the mapping target may name several nodes, `"path | path"` (each node has one `parent_id`, so it is two nodes with the same name). `EXTRA_NODES` in the draft script writes them; the apply script, the series rules and the title-keyword fallback link items to all of them; the legacy category redirect uses the first. Example: שמירת הלשון under both `מוסר ומידות` and `הלכה › בין אדם לחברו` (it used to be classified as a series only; `TOPICS_OVER_SERIES`).
- **Renaming a node**: rename it in `draft-topic-taxonomy.mjs` and regenerate, then `node scripts/source/rename-filter-node.mjs "<old path>" "<new path>" --apply` **before** `apply-topic-taxonomy.mjs --apply` — the apply upserts by path, so without the in-place rename the node gets a new id and `?topic=<id>` links break. Done for מועדים → חגים ומועדים (2026-09-25). The new site hasn't launched, so its own interim URLs (like `/topics/מועדים`) get no redirects.

## Caching (and load protection)

Content changes every few days, so the public site is cached and a flood of requests should not reach Supabase:

- **Every server-side Supabase read goes through Next's Data Cache** (`lib/supabase.ts` passes a `fetch` with `next: { revalidate: 86400, tags: ['content'] }`; constants in `lib/cache.ts`). This covers all pages, including dynamic ones (`/videos?topic=`, `/topics/...?page=`, search, `/api/search`). The browser client (admin) is not cached.
- **Pages without query parameters are ISR** (`export const revalidate = 86400`): `/`, `/series`, `/topics`, `/french`, and `/content/[id]`, `/series/[id]` (with an empty `generateStaticParams`, rendered on first visit). They are served from Vercel's CDN (`s-maxage=86400`). Don't add `force-dynamic` back; pages that read `searchParams` are dynamic on their own.
- **On-demand purge: `POST /api/revalidate`** (`revalidateTag('content')` + `revalidatePath('/', 'layout')`). Accepts `Authorization: Bearer <admin session token>` (checked with `is_admin()`) or the service role key. Every admin write in `lib/db.ts` ends with `refreshPublicSite()` (`lib/revalidate.ts`), so saves show immediately. **After a script writes to the DB, run `npm run revalidate`** (otherwise changes show within a day; a redeploy doesn't clear the Data Cache).
- Tests: `tests/e2e/cache.spec.ts` (endpoint refuses non-admins; cache header on content pages outside `next dev`).

**Vercel Firewall** (set in the dashboard: Project → Firewall → Rules; the Vercel MCP connector can't read or write the firewall config — 404 "Seawall Config not found"). Custom rules, all fixed window 60 s per IP, 429 when exceeded:

| Rule | Paths | Limit/min |
|---|---|---|
| Search rate limit | `/search`, `/api/search` | 120 |
| Revalidate endpoint rate limit | `/api/revalidate` | 20 |
| General per-IP rate limit | everything | 3,000 |

Verified 2026-09-24: revalidate 20×401 then 429; search 120×200 then 429 (other pages unaffected). A page view is 25–100 requests (Link prefetches; `/topics` alone prefetches 84), and schools share one IP, so the general limit needs headroom: at 1,000 it blocked the E2E suite (~2,000 requests/min from one IP); at 3,000 the suite passes. Vercel's automatic mitigation is separate: ~30 concurrent requests from one IP got a "Vercel Security Checkpoint" challenge (403, `X-Vercel-Mitigated: challenge`) for ~9 minutes — browsers pass it, curl doesn't. Don't load-test the live site with parallel curl.

## Backups

`.github/workflows/backup.yml` runs every Sunday 00:00 UTC (and on demand: Actions → Weekly DB backup → Run workflow): `pg_dump` of the `public` schema (schema + data; not `auth`), sanity checks (size, `content_items` row count), encrypted with `gpg` AES256, uploaded as the artifact `avinerpedia-db-YYYY-MM-DD` (kept 90 days). The repo is public, so the dump must stay encrypted. GitHub emails the repo owner when the job fails; scheduled workflows are disabled after 60 days without repo activity.

Secrets (repo Settings → Secrets and variables → Actions): `SUPABASE_DB_URL` (Supabase → Connect → **Session pooler** URI — the direct `db.<ref>.supabase.co` host is IPv6-only and unreachable from GitHub runners; URL-encode special characters in the password) and `BACKUP_PASSPHRASE` (keep a copy outside GitHub; without it the backups are unreadable).

Restore (into this or a new project):
```bash
gpg --decrypt --output avinerpedia.dump avinerpedia-YYYY-MM-DD.dump.gpg
pg_restore --no-owner --no-privileges --clean --if-exists -d "<session pooler URI>" avinerpedia.dump
```
Into a new project, `admin_users` rows reference `auth.users`, which is not in the dump: recreate the admins (see Admin). Then `npm run revalidate`.

## SEO and sharing

- **Every page builds its metadata with `pageMetadata()` from `lib/seo.ts`** (title, description, canonical, Open Graph, Twitter). Don't hand-write `openGraph`: Next.js replaces nested metadata objects instead of merging them, so a page-level `openGraph` without `images` silently drops the default share image.
- Titles: content `[Title] - הרב שלמה אבינר | אבינרפדיה`, series `סדרת [name] - שיעורי הרב שלמה אבינר`, topics `[name] - שיעורים ומאמרים | הרב שלמה אבינר`. Descriptions come from `describe()` (summary, else cleaned body, ≤160 chars).
- Canonicals drop query strings (`?from=`, `?page=`, `?topic=` all canonicalize to the base path). `/search` is `noindex, follow`. Hidden (inactive) and missing items return not-found metadata with `noindex`.
- Share images: YouTube items use `img.youtube.com/vi/<id>/hqdefault.jpg`, Machon Meir items their Vimeo thumbnail; menu pages use their own section image (`OG_IMAGES` in `lib/seo.ts`: `public/og-videos.jpg`, `og-articles`, `og-qa`, `og-series`, `og-topics` — also on topic sub-pages — and `og-french`); everything else uses `public/og-default.jpg`. All 1200×630, ~60KB (WhatsApp may skip images over ~300KB). Regenerate them with `node scripts/make-og-image.mjs [domain]` (the domain is printed on the images).
- `app/sitemap.ts`: all active content items, series, topics with items, and hubs (~8,100 URLs), revalidated daily. `app/robots.ts`: allow all, disallow `/admin` and `/api/`, points to the sitemap.
- The site URL (`SITE_URL` in `lib/seo.ts`: canonicals, og:url/og:image, sitemap, robots) is, on Vercel, the project's production domain (`VERCEL_PROJECT_PRODUCTION_URL`): `avinerpedia.vercel.app` today, the custom domain automatically once it is attached to the project. `NEXT_PUBLIC_SITE_URL` only applies off Vercel. (It was once set to `https://www.shlomo-aviner.net` while that domain still served the old wiki: every canonical and share preview pointed at the old site, and WhatsApp showed its home page video. `tests/e2e/seo.spec.ts` now checks that og:url and og:image resolve on this app.)
- `generateMetadata` and the page share one fetch via React `cache` (`getItem` in `/content/[id]`, `getSeries`, and `getFilterTree`).

## Legacy URL redirects (old shlomo-aviner.net MediaWiki)

`app/[...legacy]/route.ts` catches every path no other route matches and resolves it with `lib/legacy.ts` against `lib/legacy-redirects.json` (an in-memory map, no DB query):

| Old URL | Result |
|---|---|
| `/Title_With_Underscores` (percent-encoded Hebrew; titles may contain `/`) | 301 → `/content/[id]` |
| `/index.php?title=X`, `/w/index.php?title=X` | 301 → same |
| `/index.php?curid=N` | 301 → same |
| MediaWiki redirect pages (aliases, chains resolved) | 301 → final target |
| `/עמוד_ראשי`, `/(הרב)_אבינרפדיה-...` (old home page), bare `/index.php` | 301 → `/` |
| `/קטגוריה:X`, `/Category:X` | 301 → the curated node page (`/topics/הלכה/כשרות ומזון`), `/series/[id]` or a hub (`/videos`, `/qa`, `/french`...) |
| Hidden item, deleted page, unknown title | 302 → `/search?q=<title>` |
| Asset-like paths (`*.ico`, `*.php`...), unknown `/api/`, `/admin/`, `/_next/` | 404 |

- Titles are normalized by `legacyTitleKey()` in `lib/legacy-title.ts` (underscores, entities, `''`→`"`, first-letter case, `Category:`→`קטגוריה:`), used both at build time and per request.
- `build-legacy-redirects.ts` also writes `lib/topic-redirects.json` (old numeric topic id → curated node) and maps categories through `docs/topic-taxonomy-mapping.csv`, so **re-run it after changing the taxonomy mapping** too.
- Redirects from inside a page don't give a real 301 here (`app/loading.tsx` streams the response first); use `next.config.ts` `redirects()` or a route handler.
- **Regenerate the map whenever items are hidden/re-activated or re-imported** (it only maps to active items): `npx tsx scripts/source/build-legacy-redirects.ts`, then commit `lib/legacy-redirects.json`. First build: 8,519 titles/curids with 301 (8,259 direct, 260 via wiki redirects, 4 home), 124 redirect-to-deleted-page searches, 350 unmapped (hidden items, 6 missing pages, 36 non-topic categories) → search.
- Tests: `tests/unit/legacy.test.ts` (every mapped title resolves, lookup <1 ms) and `tests/e2e/legacy-redirects.spec.ts` (real HTTP 301/302 + Location).

**Domain switch checklist** (shlomo-aviner.net → this app): add the domain (apex + `www`) to the Vercel project and point DNS at Vercel; **set `PINNED_SITE_URL` in `lib/seo.ts` to `null`** (since 2026-09-25 the domain is attached to the project while its DNS still serves the old wiki via Cloudflare, so the origin is pinned to `avinerpedia.vercel.app`); redeploy (canonicals, sitemap and robots follow the project's production domain by themselves), and re-run `node scripts/make-og-image.mjs shlomo-aviner.net` so the share images show the new domain; make the custom domain primary so `*.vercel.app` redirects to it; in Search Console verify the domain property and submit the new sitemap (same domain, so no Change of Address); spot-check a few old URLs from Search Console's top pages.

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
   Then run `select * from public.sync_content_categories();` in the SQL Editor, and `npm run revalidate`.
3. **Items that show no content**: `docs/empty-items-review.csv` (one row per item: proposed `action`, your `decision`) → `node scripts/source/apply-empty-items-review.mjs` (dry run; `--show <id>` previews a converted page) / `--apply` (backup, then hide or fill; recomputes `filter_node_counts`), then `npx tsx scripts/source/build-legacy-redirects.ts` and `npm run revalidate`. First run (2026-09-25): of 40 active items that rendered nothing, 31 hidden (junk/test/navigation pages, videos with no id anywhere, pointer stubs, Meir ids from an old numbering that point to different lessons) and 9 filled from the source's current text (Q&A collections such as שמונה עשרה, מרן הרב קוק, whose DB copy was only a "הפניה" stub).

Shared script modules in `scripts/source/`: `wikitext-to-markdown.mjs` (source wikitext → the site's Markdown: `{{שות}}` → bold title once per run + `ש:`/`ת:`, headings, bold, lists, links; old-wiki links become site-relative so the legacy redirects resolve them; unknown templates are reported — tested in `tests/unit/wikitext.test.ts`; meant for the content refresh too), `csv.mjs` (`parseCsv`), `filter-counts.mjs` (`writeFilterCounts`: rebuild `filter_node_counts` after hiding/unhiding items).

Gotchas:
- **`import-from-wiki.ts` overwrites `main_category`/`sub_category` with old heuristics** (it put 1,745 articles into Q&A because their text contained `ש:`). Re-run the enrichment right after any re-import.
- The dump's `categorylinks` table is **stale** for ~2,000 pages bot-edited in March 2026 (the wiki's job queue never ran); `build-taxonomy` merges in categories parsed from the latest wikitext.
- 371 DB items are source-wiki redirects (aliases); they are `is_active = false`.
- **Inactive items are hidden everywhere public**: lists, search, autocomplete, series/topic pages, and `/content/[id]` (which returns the not-found page). Only `/admin` sees them. Any new public query on `content_items` must filter `is_active = true`.
- Category names in the source are sometimes HTML-entity-encoded, even doubly (`&amp;quot;`), and use `''` for `"`; normalize before comparing.
- The source site is behind Cloudflare bot protection; use the dump/XML export rather than crawling.

## Conventions and gotchas

- **RTL Hebrew**: `<html lang="he" dir="rtl">` in `app/layout.tsx`. Use `space-x-reverse` with `space-x-*`, `ArrowLeft` for "forward", `ArrowRight` for "back".
- **Titles are displayed through `displayTitle()`** (`lib/utils.ts`), which drops the source wiki's "(מאמר)" (2,345 titles) and "(וידאו)" (1,236) suffixes; other parentheses ("(וידאו קצר)", "(שו"ת)") stay. The stored title keeps them: `title` is unique and many items would collide without the suffix (77 for "(מאמר)" alone), and it matches the source. Use `displayTitle()` wherever a new place renders an item title (cards, headings, metadata, alt text).
- **Content is cleaned at display time by `cleanContent()`** (`lib/content-clean.ts`, called first thing in `ContentRenderer`; the stored text is untouched). 5,731 items were stored with `\r\r\n` line ends, which Markdown reads as a blank line, so every line the export hard-wrapped became its own paragraph ("…הלכות יסודי" / "התורה ה ט."); for those items lines are joined when the break is mid-sentence and kept as paragraphs when the line ends a sentence or the next one starts a heading, list, `ש:`/`ת:` or bold title. It also drops wiki category links and the trailing row of tag links (189 items showed `<a href=… class="wikilink"` as text), points other wiki links at the legacy redirects, and converts leftover `'''`, `== ==`, `[[ ]]`. Tests: `tests/unit/content-clean.test.ts`.
- **Video pages hide every embed in the body** (`stripVideoContent`): the player above shows `video_id`. Other embeds can't simply be kept — on 52 pages they are dead videos that `check-dead-videos` replaced in `video_id` but left in the text. Multi-lesson pages (e.g. 7651, five videos at the source) need those removed first.
- **Content HTML**: imported content contains raw HTML and wiki tags. `ContentRenderer` renders `<youtube>` and Machon Meir tags (`<machonMeeir>`, `…FR|IL|EN|France>`) as embeds; any unknown lowercase tag makes React log "tag is unrecognized" (the E2E tests fail on console errors). Raw `class=`/`frameborder=` attributes need React spellings if content is compiled as MDX.
- **Video ids**: YouTube id, `Meir:<id>` (Machon Meir lesson), or `Maale:<path>`. Machon Meir lessons are embedded **only as the bare Vimeo player**, using `lib/meir-vimeo.json` (Meir id → Vimeo id, built offline by `node scripts/build-meir-vimeo-map.mjs`; 420 of 426 have a video). Never iframe `meirtv.com` itself: its page brings a cookie banner, ads and a chat widget into our site, and scraping it at request time fails from Vercel. Without a Vimeo id the page shows a "צפה בשיעור במכון מאיר" link card. Re-run the script after importing new Meir videos. Removed/private YouTube videos: `node scripts/check-dead-videos.mjs` checks every id via YouTube oEmbed (no API key, results cached in `support/derived/youtube-status.json`) and with `--apply` switches to a working alternative id, drops the player from items that still have text, or hides items that were only a dead link (first run, 2026-09-24: 117 dead ids → 49 switched, 4 text-only, 63 hidden). Re-run it periodically. Some thumbnails still 404 for playable videos; tests ignore image failures.
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
- **Content refresh**: 2,045 pages were edited on the source after the MDX export (2026-02-14), and 246 items are empty in the DB though the source has text. `scripts/source/wikitext-to-markdown.mjs` does the conversion (used for the 9 filled items above); what's left is a script that compares every item with its source text and refreshes the changed ones, with a review list like `docs/empty-items-review.csv`.
- **Individual Q&A**: 9,645 `{{שות|כותרת=|שאלה=|תשובה=}}` blocks could become separately searchable records.
- **Missing pages**: 6 source pages (titles with `\`) are not in the DB.
- **YouTube validation**: done once with `scripts/check-dead-videos.mjs`; re-run periodically (videos keep disappearing). Meir/Maale videos are not checked.
- **Search Console**: submit `https://avinerpedia.vercel.app/sitemap.xml` in Google Search Console (and Bing Webmaster Tools) after verifying the site.
- **Cleanups**: `/wiki` (an older all-content listing via `getWikiPosts`, not linked from the navbar) and `/admin/posts` (a redirect to `/admin/content`) are leftovers; `getSeriesGroups` in `lib/db.ts` is unused; the `next-mdx-remote` dependency is unused (`gray-matter` is still used by the import script and unit tests); `@supabase/auth-helpers-nextjs` is deprecated in favor of `@supabase/ssr`.
