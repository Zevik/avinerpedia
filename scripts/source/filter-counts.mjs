/**
 * Rewrites filter_node_counts from the DB's current links (active items only): same result
 * as refresh_filter_node_counts() in migration 003, but without the API statement timeout.
 * Run after anything that changes which items are active or how they are linked.
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase service-role client
 */
export async function writeFilterCounts(supabase) {
  const check = async (label, promise) => {
    const { data, error } = await promise;
    if (error) throw new Error(`${label}: ${error.message}`);
    return data;
  };
  const readAll = async (label, query) => {
    const rows = [];
    for (let from = 0; ; from += 1000) {
      const data = await check(label, query().range(from, from + 999));
      rows.push(...data);
      if (data.length < 1000) return rows;
    }
  };

  const items = await readAll('content_items', () => supabase.from('content_items').select('id, main_category, video_id, series_id, is_active').order('id'));
  const info = new Map(items.filter((i) => i.is_active).map((i) => [i.id, i]));
  const links = await readAll('links read', () => supabase.from('content_filter_nodes').select('content_id, node_id').order('content_id').order('node_id'));

  const counts = new Map();
  const bump = (node, cat) => { const k = `${node}|${cat}`; counts.set(k, (counts.get(k) || 0) + 1); };
  for (const l of links) {
    const item = info.get(l.content_id);
    if (!item) continue;
    bump(l.node_id, item.main_category);
    // /videos lists every item with a video except series episodes (those are on /series).
    if (item.video_id && !item.series_id) bump(l.node_id, '__has_video');
  }
  const rows = [...counts].map(([k, item_count]) => {
    const [node_id, main_category] = k.split('|');
    return { node_id: Number(node_id), main_category, item_count };
  });
  await check('clear counts', supabase.from('filter_node_counts').delete().gt('node_id', 0));
  for (let i = 0; i < rows.length; i += 1000) await check('counts', supabase.from('filter_node_counts').insert(rows.slice(i, i + 1000)));
  console.log(`filter_node_counts: ${rows.length}`);
}
