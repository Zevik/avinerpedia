-- 009: cheaper library queries. Same signatures and results as 006, less work per call.
--
-- Why: pg_stat_statements showed ~60,000 library calls (mostly bots crawling filter
-- combinations) averaging 120-200 ms and peaking just under anon's 3 s statement_timeout,
-- while one call alone takes 6-47 ms: the calls compete for the (free tier) CPU. Fewer calls
-- come from robots.txt; this makes each one cheaper:
--   library_facets  one pass over the matching items for the type, source, Shulchan Aruch and
--                   total counts (006 scanned them once per facet and unnested every item's
--                   media_types); the topic counts are unchanged.
--   library_items   filters and sorts narrow rows (id + sort keys) and fetches the full columns
--                   (title, summary...) only for the page's 30 items; 006 buffered every
--                   matching row in full for the total count.
--
-- Safe to run (one transaction): the new versions are created under temporary names, compared
-- with the current functions on real argument combinations (search, topics, types, source,
-- Shulchan Aruch section, every sort order, a second page), and swapped in only if every
-- result is identical. On any difference the script stops with an error and nothing changes.

begin;

drop function if exists public.library_items_009(integer, text[], integer, text, integer, integer, text, text, text);
drop function if exists public.library_facets_009(integer, text[], integer, text, text);

create function public.library_items_009(
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
                then ts_rank(ci.fts, websearch_to_tsquery('simple', params.q)) + (ci.title ilike '%' || params.q || '%')::int end as k_rank,
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

create function public.library_facets_009(
  p_node   integer default null,
  p_types  text[]  default null,
  p_source integer default null,
  p_q      text    default null,
  p_sa     text    default null
)
returns table (facet text, key text, item_count bigint)
language sql stable as $$
  with base as materialized (
    select ci.id, ci.media_types, ci.source_id, ci.sa_section,
           (p_node is null or exists (
             select 1 from public.content_filter_nodes f where f.content_id = ci.id and f.node_id = p_node)) as in_node,
           (p_types is null or ci.media_types && p_types) as in_types,
           (p_source is null or ci.source_id = p_source) as in_source,
           (p_sa is null or ci.sa_section = p_sa) as in_sa
    from public.content_items ci
    where ci.is_active and public.library_match(ci, p_q)
  ),
  -- One pass. grouping(): 1 = the per-source rows, 2 = the per-section rows, 3 = the grand total
  -- (types and total). Each axis is counted with the other axes' filters applied, as in 006.
  -- The four media types are those of the generated column (migration 004).
  agg as (
    select source_id, sa_section, grouping(source_id, sa_section) as g,
           count(*) filter (where in_node and in_types and in_sa) as n_source,
           count(*) filter (where in_node and in_types and in_source) as n_sa,
           count(*) filter (where in_node and in_types and in_source and in_sa) as n_total,
           count(*) filter (where in_node and in_source and in_sa and 'article' = any(media_types)) as n_article,
           count(*) filter (where in_node and in_source and in_sa and 'video' = any(media_types)) as n_video,
           count(*) filter (where in_node and in_source and in_sa and 'qa' = any(media_types)) as n_qa,
           count(*) filter (where in_node and in_source and in_sa and 'series' = any(media_types)) as n_series
    from base
    group by grouping sets ((source_id), (sa_section), ())
  )
  select 'type'::text, t.key, t.n
    from agg, lateral (values ('article', n_article), ('video', n_video), ('qa', n_qa), ('series', n_series)) t(key, n)
    where agg.g = 3 and t.n > 0
  union all
  select 'source', source_id::text, n_source from agg where g = 1 and source_id is not null and n_source > 0
  union all
  select 'sa', sa_section, n_sa from agg where g = 2 and sa_section is not null and n_sa > 0
  union all
  select 'node', f.node_id::text, count(*)
    from base b join public.content_filter_nodes f on f.content_id = b.id
    where b.in_types and b.in_source and b.in_sa group by f.node_id
  union all
  select 'total', null, n_total from agg where g = 3;
$$;

-- ---------------------------------------------------------------- compare with 006
do $$
declare
  v_nodes  integer[];
  v_source integer;
  v_seed   constant text := '2026-10-07';
  a        record;
  n_facets integer := 0;
  n_items  integer := 0;
  v_old    text[];
  v_new    text[];
begin
  -- Real arguments: the two biggest topic nodes, a small one, and the first source.
  select array_agg(node_id order by n desc) into v_nodes
    from (select node_id, sum(item_count) as n from public.filter_node_counts group by node_id order by 2 desc limit 2) s;
  v_nodes := v_nodes || (select node_id from public.filter_node_counts group by node_id having sum(item_count) between 5 and 50 order by node_id limit 1);
  select id into v_source from public.sources order by sort_order limit 1;

  for a in
    -- types as array literals ('{article,qa}'), cast in the call
    select * from unnest(array[null, v_nodes[1], v_nodes[3]]) node,
                  unnest(array[null, '{video}', '{qa}', '{series}', '{article,qa}']) types_txt,
                  unnest(array[null, v_source]) src,
                  unnest(array[null, 'אמונה']) q,
                  unnest(array[null, 'אורח חיים']) sa
  loop
    select array_agg(x::text order by x::text) into v_old from public.library_facets(a.node, a.types_txt::text[], a.src, a.q, a.sa) x;
    select array_agg(x::text order by x::text) into v_new from public.library_facets_009(a.node, a.types_txt::text[], a.src, a.q, a.sa) x;
    if v_old is distinct from v_new then
      raise exception 'library_facets differs for node=% types=% source=% q=% sa=%: old % / new %',
        a.node, a.types_txt, a.src, a.q, a.sa, v_old, v_new;
    end if;
    n_facets := n_facets + 1;
  end loop;

  for a in
    select * from unnest(array[null, v_nodes[1]]) node,
                  unnest(array[null, '{video}', '{series}']) types_txt,
                  unnest(array[null, v_source]) src,
                  unnest(array[null, 'אמונה']) q,
                  unnest(array['daily', 'newest', 'series']) sort,
                  unnest(array[0, 30]) off
    where off = 0 or (node is null and src is null)  -- a second page for the unfiltered views
  loop
    select array_agg(x::text order by x.ordinality) into v_old
      from rows from (public.library_items(a.node, a.types_txt::text[], a.src, a.q, 30, a.off, null, a.sort, v_seed)) with ordinality x;
    select array_agg(x::text order by x.ordinality) into v_new
      from rows from (public.library_items_009(a.node, a.types_txt::text[], a.src, a.q, 30, a.off, null, a.sort, v_seed)) with ordinality x;
    if v_old is distinct from v_new then
      raise exception 'library_items differs for node=% types=% source=% q=% sort=% offset=%',
        a.node, a.types_txt, a.src, a.q, a.sort, a.off;
    end if;
    n_items := n_items + 1;
  end loop;

  -- Q&A with a Shulchan Aruch section, and the home page's 12-item rows of two types.
  for a in select * from unnest(array['daily', 'newest']) sort loop
    select array_agg(x::text order by x.ordinality) into v_old
      from rows from (public.library_items(null, '{qa}', null, null, 30, 0, 'אורח חיים', a.sort, v_seed)) with ordinality x;
    select array_agg(x::text order by x.ordinality) into v_new
      from rows from (public.library_items_009(null, '{qa}', null, null, 30, 0, 'אורח חיים', a.sort, v_seed)) with ordinality x;
    if v_old is distinct from v_new then raise exception 'library_items differs for qa + section, sort=%', a.sort; end if;
    select array_agg(x::text order by x.ordinality) into v_old
      from rows from (public.library_items(null, '{qa,article}', null, null, 12, 0, null, a.sort, v_seed)) with ordinality x;
    select array_agg(x::text order by x.ordinality) into v_new
      from rows from (public.library_items_009(null, '{qa,article}', null, null, 12, 0, null, a.sort, v_seed)) with ordinality x;
    if v_old is distinct from v_new then raise exception 'library_items differs for the home page row, sort=%', a.sort; end if;
    n_items := n_items + 2;
  end loop;

  raise notice '009: % facet and % item calls identical to 006', n_facets, n_items;
end $$;

-- ---------------------------------------------------------------- swap in
drop function public.library_items(integer, text[], integer, text, integer, integer, text, text, text);
drop function public.library_facets(integer, text[], integer, text, text);
alter function public.library_items_009(integer, text[], integer, text, integer, integer, text, text, text) rename to library_items;
alter function public.library_facets_009(integer, text[], integer, text, text) rename to library_facets;

grant execute on function public.library_items(integer, text[], integer, text, integer, integer, text, text, text) to anon, authenticated;
grant execute on function public.library_facets(integer, text[], integer, text, text) to anon, authenticated;

-- PostgREST caches the function list; reload it so the swapped functions are found at once.
notify pgrst, 'reload schema';

commit;
