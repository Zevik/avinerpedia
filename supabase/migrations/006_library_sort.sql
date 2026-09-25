-- 006: library sort orders, including the daily shuffle. Replaces library_items and
-- library_facets (includes everything from 005, so 005 need not be run separately).
-- Idempotent. Calls without the new parameters keep working.
--
-- p_sort:
--   'daily'  (default) a shuffle that is stable for a whole day: md5(id || p_seed), where the app
--            passes today's date in Israel as p_seed. Same order all day (cache-friendly, no
--            duplicates across pages), a new order after midnight.
--   'newest' publish_date where known, else the source wiki's page id (it grows over time).
--   'series' series, then episode order (for series episodes: their order matters).
-- A search (p_q) always sorts by relevance first.

drop function if exists public.library_items(integer, text[], integer, text, integer, integer);
drop function if exists public.library_items(integer, text[], integer, text, integer, integer, text);
drop function if exists public.library_items(integer, text[], integer, text, integer, integer, text, text, text);
drop function if exists public.library_facets(integer, text[], integer, text);
drop function if exists public.library_facets(integer, text[], integer, text, text);

create or replace function public.library_items(
  p_node   integer default null,
  p_types  text[]  default null,
  p_source integer default null,
  p_q      text    default null,
  p_limit  integer default 30,
  p_offset integer default 0,
  p_sa     text    default null,
  p_sort   text    default 'daily',
  p_seed   text    default null
)
returns table (
  id bigint, title text, summary text, video_id text, content_type text, main_category text,
  sub_category text, publish_date date, series_id integer, source_id integer,
  media_types text[], total bigint
)
language sql stable as $$
  with params as (
    select nullif(btrim(coalesce(p_q, '')), '') as q,
           coalesce(p_seed, to_char(now() at time zone 'Asia/Jerusalem', 'YYYY-MM-DD')) as seed
  )
  select ci.id, ci.title, ci.summary, ci.video_id, ci.content_type, ci.main_category,
         ci.sub_category, ci.publish_date, ci.series_id, ci.source_id, ci.media_types,
         count(*) over () as total
  from public.content_items ci, params
  where ci.is_active
    and (p_node is null or exists (
          select 1 from public.content_filter_nodes f where f.content_id = ci.id and f.node_id = p_node))
    and (p_types is null or ci.media_types && p_types)
    and (p_source is null or ci.source_id = p_source)
    and (p_sa is null or ci.sa_section = p_sa)
    and public.library_match(ci, params.q)
  order by
    case when params.q is not null
         then ts_rank(ci.fts, websearch_to_tsquery('simple', params.q)) + (ci.title ilike '%' || params.q || '%')::int end desc nulls last,
    case when params.q is null and p_sort = 'series' then ci.series_id end,
    case when params.q is null and p_sort = 'series' then ci.series_order end,
    case when params.q is null and p_sort = 'daily' then md5(ci.id::text || params.seed) end,
    ci.publish_date desc nulls last,
    ci.source_page_id desc nulls last,
    ci.id desc
  limit least(greatest(p_limit, 1), 100) offset greatest(p_offset, 0);
$$;

create or replace function public.library_facets(
  p_node   integer default null,
  p_types  text[]  default null,
  p_source integer default null,
  p_q      text    default null,
  p_sa     text    default null
)
returns table (facet text, key text, item_count bigint)
language sql stable as $$
  with base as (
    select ci.id, ci.media_types, ci.source_id, ci.sa_section,
           (p_node is null or exists (
             select 1 from public.content_filter_nodes f where f.content_id = ci.id and f.node_id = p_node)) as in_node,
           (p_types is null or ci.media_types && p_types) as in_types,
           (p_source is null or ci.source_id = p_source) as in_source,
           (p_sa is null or ci.sa_section = p_sa) as in_sa
    from public.content_items ci
    where ci.is_active and public.library_match(ci, p_q)
  )
  select 'type', t, count(*) from base, unnest(base.media_types) t where in_node and in_source and in_sa group by t
  union all
  select 'source', source_id::text, count(*) from base where source_id is not null and in_node and in_types and in_sa group by source_id
  union all
  select 'sa', sa_section, count(*) from base where sa_section is not null and in_node and in_types and in_source group by sa_section
  union all
  select 'node', f.node_id::text, count(*)
    from base b join public.content_filter_nodes f on f.content_id = b.id
    where b.in_types and b.in_source and b.in_sa group by f.node_id
  union all
  select 'total', null, count(*) from base where in_node and in_types and in_source and in_sa;
$$;

grant execute on function public.library_items(integer, text[], integer, text, integer, integer, text, text, text) to anon, authenticated;
grant execute on function public.library_facets(integer, text[], integer, text, text) to anon, authenticated;
