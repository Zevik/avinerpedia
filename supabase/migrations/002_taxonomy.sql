-- ============================================================================
-- 002: taxonomy from the source MediaWiki (topics tree, series, per-item links).
-- Run once in the Supabase SQL Editor after supabase/schema.sql.
-- Populated by: node scripts/source/apply-enrichment.mjs --apply
-- ============================================================================

-- Link back to the source wiki page, and structured type/series fields.
alter table public.content_items
  add column if not exists source_page_id    integer unique,
  add column if not exists content_type      text check (content_type in ('video', 'article', 'qa', 'series', 'french')),
  add column if not exists root_topic        text,
  add column if not exists series_id         integer,
  add column if not exists series_order      integer,
  add column if not exists source_updated_at timestamptz;

-- ----------------------------------------------------------------------------
-- topics: the unified subject tree. The source has three parallel trees
-- ("X (וידאו)", "X (מאמרים)", "X (שו"ת)") merged into one; a topic can have
-- several parents (e.g. עם ישראל is under both אמונה and מדינת ישראל).
-- ----------------------------------------------------------------------------
create table if not exists public.topics (
  id         serial primary key,
  name       text not null unique,
  depth      integer not null default 0,     -- 0 = root
  item_count integer not null default 0,     -- items tagged directly
  created_at timestamptz not null default now()
);

create table if not exists public.topic_parents (
  topic_id  integer not null references public.topics (id) on delete cascade,
  parent_id integer not null references public.topics (id) on delete cascade,
  primary key (topic_id, parent_id),
  check (topic_id <> parent_id)
);
create index if not exists idx_topic_parents_parent on public.topic_parents (parent_id);

create table if not exists public.content_topics (
  content_id bigint  not null references public.content_items (id) on delete cascade,
  topic_id   integer not null references public.topics (id) on delete cascade,
  is_primary boolean not null default false,
  primary key (content_id, topic_id)
);
create index if not exists idx_content_topics_topic on public.content_topics (topic_id);

-- ----------------------------------------------------------------------------
-- series: ordered lesson series (category-based on the source, or detected
-- from numbered titles like "כוזרי (12) - ...").
-- ----------------------------------------------------------------------------
create table if not exists public.series (
  id            serial primary key,
  name          text not null unique,
  detected_by   text not null,                -- category | title_pattern | category+title
  episode_count integer not null default 0,
  created_at    timestamptz not null default now()
);

alter table public.content_items
  drop constraint if exists content_items_series_id_fkey,
  add constraint content_items_series_id_fkey
    foreign key (series_id) references public.series (id) on delete set null;

create index if not exists idx_content_items_content_type on public.content_items (content_type);
create index if not exists idx_content_items_root_topic   on public.content_items (root_topic);
create index if not exists idx_content_items_series       on public.content_items (series_id, series_order);

-- ----------------------------------------------------------------------------
-- RLS: public read, admin write (same model as schema.sql).
-- ----------------------------------------------------------------------------
alter table public.topics         enable row level security;
alter table public.topic_parents  enable row level security;
alter table public.content_topics enable row level security;
alter table public.series         enable row level security;

drop policy if exists "topics: public read" on public.topics;
drop policy if exists "topics: admin write" on public.topics;
create policy "topics: public read" on public.topics for select using (true);
create policy "topics: admin write" on public.topics for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "topic_parents: public read" on public.topic_parents;
drop policy if exists "topic_parents: admin write" on public.topic_parents;
create policy "topic_parents: public read" on public.topic_parents for select using (true);
create policy "topic_parents: admin write" on public.topic_parents for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "content_topics: public read" on public.content_topics;
drop policy if exists "content_topics: admin write" on public.content_topics;
create policy "content_topics: public read" on public.content_topics for select using (true);
create policy "content_topics: admin write" on public.content_topics for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "series: public read" on public.series;
drop policy if exists "series: admin write" on public.series;
create policy "series: public read" on public.series for select using (true);
create policy "series: admin write" on public.series for all using (public.is_admin()) with check (public.is_admin());

-- ----------------------------------------------------------------------------
-- Sub-categories that no item uses any more (after re-classification) are removed
-- by sync_content_categories(), so the filter sidebars only list real topics.
-- ----------------------------------------------------------------------------
create or replace function public.sync_content_categories()
returns table (main_linked bigint, sub_categories bigint, sub_linked bigint, deactivated bigint)
language plpgsql security definer set search_path = public as $$
declare
  v_main bigint; v_subcats bigint; v_sub bigint; v_inactive bigint;
begin
  update content_items ci set main_category_id = c.id
  from categories c
  where c.type = 'main' and c.name = ci.main_category
    and ci.main_category_id is distinct from c.id;
  get diagnostics v_main = row_count;

  -- Each sub-category goes under the main category most of its items belong to.
  insert into categories (name, type, parent_id)
  select distinct on (ci.sub_category) ci.sub_category, 'sub', ci.main_category_id
  from content_items ci
  where ci.sub_category is not null and ci.sub_category <> '' and ci.main_category_id is not null
    and not exists (select 1 from categories c where c.type = 'sub' and c.name = ci.sub_category)
  group by ci.sub_category, ci.main_category_id
  order by ci.sub_category, count(*) desc
  on conflict do nothing;

  update content_items ci set sub_category_id = c.id
  from categories c
  where c.type = 'sub' and c.name = ci.sub_category
    and ci.sub_category_id is distinct from c.id;
  get diagnostics v_sub = row_count;

  update content_items set sub_category_id = null
  where sub_category is null and sub_category_id is not null;

  delete from categories c
  where c.type = 'sub'
    and not exists (select 1 from content_items ci where ci.sub_category_id = c.id);

  select count(*) into v_subcats from categories where type = 'sub';

  update content_items set is_active = false
  where is_active
    and coalesce(content_md, '') = ''
    and coalesce(video_id, '') = '';
  get diagnostics v_inactive = row_count;

  return query select v_main, v_subcats, v_sub, v_inactive;
end;
$$;

revoke execute on function public.sync_content_categories() from public, anon, authenticated;
grant execute on function public.sync_content_categories() to service_role;
