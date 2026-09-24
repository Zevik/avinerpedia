-- ============================================================================
-- 003: curated filter tree (docs/TOPIC_TAXONOMY_DRAFT.md).
-- 11 core topics -> sub-topics -> (optional) "הלכות X" / parasha levels, replacing the
-- ~620 raw sub-categories in the filter sidebars. The raw `topics` stay as tags.
-- Run once in the Supabase SQL Editor; populated by
--   node scripts/source/apply-topic-taxonomy.mjs --apply
-- ============================================================================

create table if not exists public.filter_nodes (
  id         serial primary key,
  path       text not null unique,        -- "מועדים › חנוכה › הלכות חנוכה"
  name       text not null,               -- last path segment
  parent_id  integer references public.filter_nodes (id) on delete cascade,
  depth      integer not null,            -- 0 = core topic
  sort_order integer not null default 0,  -- order within the parent (curated, not alphabetical)
  created_at timestamptz not null default now()
);
create index if not exists idx_filter_nodes_parent on public.filter_nodes (parent_id);

-- Every item is linked to its nodes AND their ancestors, so filtering by a core topic is
-- a single indexed lookup.
create table if not exists public.content_filter_nodes (
  content_id bigint  not null references public.content_items (id) on delete cascade,
  node_id    integer not null references public.filter_nodes (id) on delete cascade,
  primary key (content_id, node_id)
);
create index if not exists idx_content_filter_nodes_node on public.content_filter_nodes (node_id);

-- Active item counts per node and per page (main_category), for the filter sidebars.
create table if not exists public.filter_node_counts (
  node_id       integer not null references public.filter_nodes (id) on delete cascade,
  main_category text    not null,
  item_count    integer not null,
  primary key (node_id, main_category)
);

alter table public.content_items
  add column if not exists primary_node_id   integer references public.filter_nodes (id) on delete set null,
  add column if not exists sa_section        text,   -- אורח חיים / יורה דעה / אבן העזר / חושן משפט (Q&A axis)
  add column if not exists source_collection text;   -- e.g. ישיבת עטרת ירושלים (metadata, not a topic)

create index if not exists idx_content_items_sa_section on public.content_items (sa_section);
create index if not exists idx_content_items_source_collection on public.content_items (source_collection);

alter table public.filter_nodes         enable row level security;
alter table public.content_filter_nodes enable row level security;
alter table public.filter_node_counts   enable row level security;

drop policy if exists "filter_nodes: public read" on public.filter_nodes;
drop policy if exists "filter_nodes: admin write" on public.filter_nodes;
create policy "filter_nodes: public read" on public.filter_nodes for select using (true);
create policy "filter_nodes: admin write" on public.filter_nodes for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "content_filter_nodes: public read" on public.content_filter_nodes;
drop policy if exists "content_filter_nodes: admin write" on public.content_filter_nodes;
create policy "content_filter_nodes: public read" on public.content_filter_nodes for select using (true);
create policy "content_filter_nodes: admin write" on public.content_filter_nodes for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "filter_node_counts: public read" on public.filter_node_counts;
drop policy if exists "filter_node_counts: admin write" on public.filter_node_counts;
create policy "filter_node_counts: public read" on public.filter_node_counts for select using (true);
create policy "filter_node_counts: admin write" on public.filter_node_counts for all using (public.is_admin()) with check (public.is_admin());

-- Recomputes filter_node_counts from content_filter_nodes (active items only).
-- Called by the apply script; also safe to run by hand after editing items.
create or replace function public.refresh_filter_node_counts()
returns integer
language plpgsql security definer set search_path = public as $$
declare v_rows integer;
begin
  -- "where true": Supabase's safe-update guard rejects an unqualified DELETE via the API.
  delete from filter_node_counts where true;
  insert into filter_node_counts (node_id, main_category, item_count)
  select cfn.node_id, ci.main_category, count(*)
  from content_filter_nodes cfn
  join content_items ci on ci.id = cfn.content_id
  where ci.is_active
  group by cfn.node_id, ci.main_category
  union all
  -- /videos lists every active item with a video, whatever its main_category.
  select cfn.node_id, '__has_video', count(*)
  from content_filter_nodes cfn
  join content_items ci on ci.id = cfn.content_id
  where ci.is_active and coalesce(ci.video_id, '') <> ''
  group by cfn.node_id;
  get diagnostics v_rows = row_count;
  return v_rows;
end;
$$;

revoke execute on function public.refresh_filter_node_counts() from public, anon, authenticated;
grant execute on function public.refresh_filter_node_counts() to service_role;
