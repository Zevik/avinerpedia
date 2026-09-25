-- 004: the content library (/library) — three browsing axes over all content:
--   topic  (the curated filter tree, migration 003)
--   type   (article / video / qa / series; an item can be several: a Q&A answered on video
--           is both qa and video)
--   source (ישיבת עטרת ירושלים, מכון מאיר, שו"ת סמס, ציוצים, שירים, מאמרים מיוחדים)
-- Idempotent: safe to run again. Items get their source_id from
-- scripts/source/apply-sources.mjs (run after this migration).

-- ---------------------------------------------------------------- sources
create table if not exists public.sources (
  id          serial primary key,
  slug        text not null unique,      -- URL value: /library?source=ateret
  name        text not null,
  description text,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now()
);

alter table public.sources enable row level security;
drop policy if exists "sources: public read" on public.sources;
create policy "sources: public read" on public.sources for select using (true);
drop policy if exists "sources: admin write" on public.sources;
create policy "sources: admin write" on public.sources for all
  using (public.is_admin()) with check (public.is_admin());

insert into public.sources (slug, name, sort_order) values
  ('ateret',           'ישיבת עטרת ירושלים', 1),
  ('machon-meir',      'מכון מאיר',          2),
  ('shut-sms',         'שו"ת סמס',           3),
  ('tweets',           'ציוצים',             4),
  ('poems',            'שירים',              5),
  ('special-articles', 'מאמרים מיוחדים',     6)
on conflict (slug) do nothing;

alter table public.content_items
  add column if not exists source_id integer references public.sources (id) on delete set null;
create index if not exists idx_content_items_source on public.content_items (source_id);

-- ---------------------------------------------------------------- media types
-- Derived from the item itself, so it never goes stale:
--   qa      a Q&A page (content_type 'qa'), with or without a video
--   video   has a video and is not a series episode (series episodes are on /series)
--   series  a series episode
--   article everything else with text (articles, text-only videos/french pages)
alter table public.content_items
  add column if not exists media_types text[] generated always as (
    array_remove(array[
      case when content_type = 'qa' then 'qa' end,
      case when coalesce(content_type, '') <> 'qa' and coalesce(video_id, '') = '' and series_id is null then 'article' end,
      case when coalesce(video_id, '') <> '' and series_id is null then 'video' end,
      case when series_id is not null then 'series' end
    ], null)
  ) stored;
create index if not exists idx_content_items_media_types on public.content_items using gin (media_types);

-- ---------------------------------------------------------------- search helper
-- Full-text match (title weighted) or a title substring, like the site's search box.
create or replace function public.library_match(ci public.content_items, p_q text)
returns boolean
language sql stable as $$
  select p_q is null or btrim(p_q) = ''
      or ci.fts @@ websearch_to_tsquery('simple', p_q)
      or ci.title ilike '%' || replace(replace(btrim(p_q), '%', '\%'), '_', '\_') || '%';
$$;

-- ---------------------------------------------------------------- results
-- One page of results with the total. Order: relevance when searching, then newest
-- (publish_date where known, else the source wiki's page id, which grows over time).
create or replace function public.library_items(
  p_node   integer default null,
  p_types  text[]  default null,
  p_source integer default null,
  p_q      text    default null,
  p_limit  integer default 30,
  p_offset integer default 0
)
returns table (
  id bigint, title text, summary text, video_id text, content_type text, main_category text,
  sub_category text, publish_date date, series_id integer, source_id integer,
  media_types text[], total bigint
)
language sql stable as $$
  select ci.id, ci.title, ci.summary, ci.video_id, ci.content_type, ci.main_category,
         ci.sub_category, ci.publish_date, ci.series_id, ci.source_id, ci.media_types,
         count(*) over () as total
  from public.content_items ci
  where ci.is_active
    and (p_node is null or exists (
          select 1 from public.content_filter_nodes f where f.content_id = ci.id and f.node_id = p_node))
    and (p_types is null or ci.media_types && p_types)
    and (p_source is null or ci.source_id = p_source)
    and public.library_match(ci, p_q)
  order by
    case when p_q is null or btrim(p_q) = '' then 0
         else ts_rank(ci.fts, websearch_to_tsquery('simple', p_q)) + (ci.title ilike '%' || btrim(p_q) || '%')::int end desc,
    ci.publish_date desc nulls last,
    ci.source_page_id desc nulls last,
    ci.id desc
  limit least(greatest(p_limit, 1), 100) offset greatest(p_offset, 0);
$$;

-- ---------------------------------------------------------------- facet counts
-- For each axis, counts with the OTHER axes' filters applied (standard faceted counts), so
-- every option shows how many results picking it would give.
create or replace function public.library_facets(
  p_node   integer default null,
  p_types  text[]  default null,
  p_source integer default null,
  p_q      text    default null
)
returns table (facet text, key text, item_count bigint)
language sql stable as $$
  with base as (
    select ci.id, ci.media_types, ci.source_id,
           (p_node is null or exists (
             select 1 from public.content_filter_nodes f where f.content_id = ci.id and f.node_id = p_node)) as in_node,
           (p_types is null or ci.media_types && p_types) as in_types,
           (p_source is null or ci.source_id = p_source) as in_source
    from public.content_items ci
    where ci.is_active and public.library_match(ci, p_q)
  )
  select 'type', t, count(*) from base, unnest(base.media_types) t where in_node and in_source group by t
  union all
  select 'source', source_id::text, count(*) from base where source_id is not null and in_node and in_types group by source_id
  union all
  select 'node', f.node_id::text, count(*)
    from base b join public.content_filter_nodes f on f.content_id = b.id
    where b.in_types and b.in_source group by f.node_id
  union all
  select 'total', null, count(*) from base where in_node and in_types and in_source;
$$;

grant execute on function public.library_match(public.content_items, text) to anon, authenticated;
grant execute on function public.library_items(integer, text[], integer, text, integer, integer) to anon, authenticated;
grant execute on function public.library_facets(integer, text[], integer, text) to anon, authenticated;
