-- 011: searches combined with filters: find the search matches first, then filter them.
--
-- Why (2026-10-10): after 010 almost every remaining timeout (HTTP 500) was a search plus a
-- topic filter (logged by describeState(), e.g. "q=12 chars/2 words type=article topic=82"),
-- typically a crawler walking the ~200 topic links of a results page with the same search.
-- "הלכות שבת" alone: 0.25 s; with topic 82 and type article: 3.6 s, past anon's 3 s limit.
-- With both conditions the planner walked the topic's items and evaluated the full-text match
-- row by row instead of using the GIN index.
--
-- Now both functions first collect the ids matching the search (or every active id when there
-- is no search) in a MATERIALIZED CTE, which the planner answers with the index on its own, and
-- apply topic / type / source / section to that set. Same signatures, same results.
--
-- Safe to run (one transaction): the new versions are created as *_011, compared with the
-- current functions on real argument combinations (including the slow ones above), and swapped
-- in only if every result is identical. On any difference it raises and nothing changes.

begin;

-- The comparisons call the current (slow) functions too.
set local statement_timeout = '120s';

drop function if exists public.library_items_011(integer, text[], integer, text, integer, integer, text, text, text);
drop function if exists public.library_facets_011(integer, text[], integer, text, text);

create function public.library_items_011(
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
  -- The search matches on their own (GIN index), before any filter.
  hits as materialized (
    select ci.id
    from public.content_items ci, params
    where ci.is_active and public.library_match(ci, params.q)
  ),
  -- Every match that passes the filters, with only its sort keys.
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
    from hits h
    join public.content_items ci on ci.id = h.id
    cross join params
    where (p_node is null or exists (
            select 1 from public.content_filter_nodes f where f.content_id = ci.id and f.node_id = p_node))
      and (p_types is null or ci.media_types && p_types)
      and (p_source is null or ci.source_id = p_source)
      and (p_sa is null or ci.sa_section = p_sa)
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

create function public.library_facets_011(
  p_node   integer default null,
  p_types  text[]  default null,
  p_source integer default null,
  p_q      text    default null,
  p_sa     text    default null
)
returns table (facet text, key text, item_count bigint)
language sql stable as $$
  -- The search matches on their own (GIN index), before any filter.
  with hits as materialized (
    select ci.id
    from public.content_items ci
    where ci.is_active and public.library_match(ci, p_q)
  ),
  base as materialized (
    select ci.id, ci.media_types, ci.source_id, ci.sa_section,
           (p_node is null or exists (
             select 1 from public.content_filter_nodes f where f.content_id = ci.id and f.node_id = p_node)) as in_node,
           (p_types is null or ci.media_types && p_types) as in_types,
           (p_source is null or ci.source_id = p_source) as in_source,
           (p_sa is null or ci.sa_section = p_sa) as in_sa
    from hits h
    join public.content_items ci on ci.id = h.id
  ),
  -- One pass. grouping(): 1 = the per-source rows, 2 = the per-section rows, 3 = the grand total
  -- (types and total). Each axis is counted with the other axes' filters applied.
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

-- ---------------------------------------------------------------- compare with the current functions
do $$
declare
  v_nodes  integer[];
  v_source integer;
  v_seed   constant text := '2026-10-10';
  a        record;
  n_checked integer := 0;
  v_old    text[];
  v_new    text[];
begin
  -- Topic 82 (the logged slow case), the biggest node, and a small one; the first source.
  select array_agg(node_id order by n desc) into v_nodes
    from (select node_id, sum(item_count) as n from public.filter_node_counts group by node_id order by 2 desc limit 1) s;
  v_nodes := array[82] || v_nodes
    || (select node_id from public.filter_node_counts group by node_id having sum(item_count) between 5 and 50 order by node_id limit 1);
  select id into v_source from public.sources order by sort_order limit 1;

  for a in
    select * from unnest(array[null, v_nodes[1], v_nodes[2], v_nodes[3]]) node,
                  unnest(array[null, '{article}', '{video}']) types_txt,
                  unnest(array[null, v_source]) src,
                  unnest(array[null, 'הלכות שבת', 'של']) q
    where q is not null or node is null or types_txt is null   -- keep the no-search cases few
  loop
    select array_agg(x::text order by x::text) into v_old from public.library_facets(a.node, a.types_txt::text[], a.src, a.q, null) x;
    select array_agg(x::text order by x::text) into v_new from public.library_facets_011(a.node, a.types_txt::text[], a.src, a.q, null) x;
    if v_old is distinct from v_new then
      raise exception 'library_facets differs for node=% types=% source=% q=%', a.node, a.types_txt, a.src, a.q;
    end if;

    select array_agg(x::text order by x.ordinality) into v_old
      from rows from (public.library_items(a.node, a.types_txt::text[], a.src, a.q, 30, 0, null, 'daily', v_seed)) with ordinality x;
    select array_agg(x::text order by x.ordinality) into v_new
      from rows from (public.library_items_011(a.node, a.types_txt::text[], a.src, a.q, 30, 0, null, 'daily', v_seed)) with ordinality x;
    if v_old is distinct from v_new then
      raise exception 'library_items differs for node=% types=% source=% q=%', a.node, a.types_txt, a.src, a.q;
    end if;
    n_checked := n_checked + 1;
  end loop;

  -- Other sort orders, a second page, and Q&A with a Shulchan Aruch section.
  for a in select * from unnest(array['newest', 'series']) sort, unnest(array[0, 30]) off loop
    select array_agg(x::text order by x.ordinality) into v_old
      from rows from (public.library_items(null, null, null, null, 30, a.off, null, a.sort, v_seed)) with ordinality x;
    select array_agg(x::text order by x.ordinality) into v_new
      from rows from (public.library_items_011(null, null, null, null, 30, a.off, null, a.sort, v_seed)) with ordinality x;
    if v_old is distinct from v_new then raise exception 'library_items differs for sort=% offset=%', a.sort, a.off; end if;
  end loop;
  select array_agg(x::text order by x.ordinality) into v_old
    from rows from (public.library_items(null, '{qa}', null, null, 30, 0, 'אורח חיים', 'daily', v_seed)) with ordinality x;
  select array_agg(x::text order by x.ordinality) into v_new
    from rows from (public.library_items_011(null, '{qa}', null, null, 30, 0, 'אורח חיים', 'daily', v_seed)) with ordinality x;
  if v_old is distinct from v_new then raise exception 'library_items differs for qa + section'; end if;

  raise notice '011: % argument combinations identical', n_checked;
end $$;

-- ---------------------------------------------------------------- swap in
drop function public.library_items(integer, text[], integer, text, integer, integer, text, text, text);
drop function public.library_facets(integer, text[], integer, text, text);
alter function public.library_items_011(integer, text[], integer, text, integer, integer, text, text, text) rename to library_items;
alter function public.library_facets_011(integer, text[], integer, text, text) rename to library_facets;

grant execute on function public.library_items(integer, text[], integer, text, integer, integer, text, text, text) to anon, authenticated;
grant execute on function public.library_facets(integer, text[], integer, text, text) to anon, authenticated;

notify pgrst, 'reload schema';

commit;
