-- 007: topics from the admin form. Idempotent.
--   admin_set_item_topics(item, nodes, primary)  links an item to curated nodes (plus their
--       ancestors, like apply-topic-taxonomy.mjs), sets primary_node_id and sub_category, marks the
--       item topics_manual, and recounts the affected nodes.
--   admin_refresh_item_counts(item)  recounts the item's nodes after a save that changed its
--       type, video or visibility (filter_node_counts are per main_category / __has_video).
-- Both require is_admin(). topics_manual items keep their links when
-- scripts/source/apply-topic-taxonomy.mjs --apply rebuilds the rest.

alter table public.content_items
  add column if not exists topics_manual boolean not null default false;

-- Recount some nodes (same rules as refresh_filter_node_counts in 003 / filter-counts.mjs).
create or replace function public.refresh_node_counts(p_nodes integer[])
returns void
language sql security definer set search_path = public as $$
  delete from filter_node_counts where node_id = any(p_nodes);
  insert into filter_node_counts (node_id, main_category, item_count)
  select cfn.node_id, ci.main_category, count(*)
  from content_filter_nodes cfn join content_items ci on ci.id = cfn.content_id
  where ci.is_active and cfn.node_id = any(p_nodes)
  group by cfn.node_id, ci.main_category
  union all
  select cfn.node_id, '__has_video', count(*)
  from content_filter_nodes cfn join content_items ci on ci.id = cfn.content_id
  where ci.is_active and coalesce(ci.video_id, '') <> '' and ci.series_id is null and cfn.node_id = any(p_nodes)
  group by cfn.node_id;
$$;
revoke execute on function public.refresh_node_counts(integer[]) from public, anon, authenticated;

create or replace function public.admin_set_item_topics(p_item bigint, p_nodes integer[], p_primary integer default null)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_old     integer[];
  v_new     integer[];
  v_primary integer;
begin
  if not public.is_admin() then
    raise exception 'admin only' using errcode = '42501';
  end if;

  select coalesce(array_agg(node_id), '{}') into v_old from content_filter_nodes where content_id = p_item;

  -- The chosen nodes and all their ancestors.
  with recursive up as (
    select id, parent_id from filter_nodes where id = any(coalesce(p_nodes, '{}'))
    union
    select f.id, f.parent_id from filter_nodes f join up on f.id = up.parent_id
  )
  select coalesce(array_agg(distinct id), '{}') into v_new from up;

  delete from content_filter_nodes where content_id = p_item;
  insert into content_filter_nodes (content_id, node_id) select p_item, unnest(v_new);

  v_primary := case when p_primary = any(coalesce(p_nodes, '{}')) then p_primary else p_nodes[1] end;
  update content_items
     set primary_node_id = v_primary,
         -- Cards show sub_category: the primary node's name (as the taxonomy script does).
         sub_category = coalesce((select name from filter_nodes where id = v_primary), sub_category),
         topics_manual = true
   where id = p_item;

  perform public.refresh_node_counts(v_old || v_new);
end;
$$;

create or replace function public.admin_refresh_item_counts(p_item bigint)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    raise exception 'admin only' using errcode = '42501';
  end if;
  perform public.refresh_node_counts(array(select node_id from content_filter_nodes where content_id = p_item));
end;
$$;

revoke execute on function public.admin_set_item_topics(bigint, integer[], integer) from public, anon;
revoke execute on function public.admin_refresh_item_counts(bigint) from public, anon;
grant execute on function public.admin_set_item_topics(bigint, integer[], integer) to authenticated;
grant execute on function public.admin_refresh_item_counts(bigint) to authenticated;
