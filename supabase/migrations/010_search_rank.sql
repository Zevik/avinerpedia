-- 010: fast relevance ranking for library searches.
--
-- Why (2026-10-09): a search for a very common word (e.g. "של") timed out every time
-- (> anon's 3 s statement_timeout, HTTP 500): library_items ranked every match with
-- ts_rank(fts), and fts holds the whole article body, so ranking thousands of matches meant
-- reading thousands of large tsvectors. Ordinary searches take 0.1-0.6 s.
--
-- Now the rank reads fts_head: title (weight A) + summary (weight B) only, a small stored
-- column. Matching is unchanged (fts @@ query, or a title substring, via library_match); the
-- body's weight-C contribution to the rank is dropped, so items that match only in the body
-- rank 0 among themselves and fall back to the usual tie-breakers (newest first). The
-- title-substring bonus (+1) is kept.
--
-- Idempotent. library_items keeps its 009 signature and body apart from the rank expression.

alter table public.content_items
  add column if not exists fts_head tsvector generated always as (
    setweight(to_tsvector('simple', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(summary, '')), 'B')
  ) stored;

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
  ),
  -- Every match, but only its id and sort keys.
  matched as (
    select ci.id,
           case when params.q is not null
                then ts_rank(ci.fts_head, websearch_to_tsquery('simple', params.q)) + (ci.title ilike '%' || params.q || '%')::int end as k_rank,
           case when params.q is null and p_sort = 'series' then ci.series_id end as k_series,
           case when params.q is null and p_sort = 'series' then ci.series_order end as k_order,
           case when params.q is null and p_sort = 'daily' then md5(ci.id::text || params.seed) end as k_daily,
           ci.publish_date as k_date,
           ci.source_page_id as k_page,
           count(*) over () as total
    from public.content_items ci, params
    where ci.is_active
      and (p_node is null or exists (
            select 1 from public.content_filter_nodes f where f.content_id = ci.id and f.node_id = p_node))
      and (p_types is null or ci.media_types && p_types)
      and (p_source is null or ci.source_id = p_source)
      and (p_sa is null or ci.sa_section = p_sa)
      and public.library_match(ci, params.q)
  ),
  page as (
    select * from matched m
    order by m.k_rank desc nulls last, m.k_series, m.k_order, m.k_daily,
             m.k_date desc nulls last, m.k_page desc nulls last, m.id desc
    limit least(greatest(p_limit, 1), 100) offset greatest(p_offset, 0)
  )
  select ci.id, ci.title, ci.summary, ci.video_id, ci.content_type, ci.main_category,
         ci.sub_category, ci.publish_date, ci.series_id, ci.source_id, ci.media_types, p.total
  from page p
  join public.content_items ci on ci.id = p.id
  order by p.k_rank desc nulls last, p.k_series, p.k_order, p.k_daily,
           p.k_date desc nulls last, p.k_page desc nulls last, p.id desc;
$$;

grant execute on function public.library_items(integer, text[], integer, text, integer, integer, text, text, text) to anon, authenticated;

notify pgrst, 'reload schema';
