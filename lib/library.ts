import { cache } from 'react';
import { supabase } from './supabase';
import type { FilterNode } from './types';
import { dailySeed } from './daily';
import { effectiveSort, isMediaType, LIBRARY_PAGE_SIZE, type LibraryState, type MediaType } from './library-url';

export * from './library-url';

/**
 * The content library (/library, and /videos /articles /qa as presets of it): all content,
 * filtered along three axes — topic (curated filter tree), media type and source — plus a
 * search box and, for Q&A, the Shulchan Aruch section. Queries run in Postgres
 * (supabase/migrations/004_library.sql, 006_library_sort.sql).
 */

export interface Source {
  id: number;
  slug: string;
  name: string;
  sort_order: number;
}

export const getSources = cache(async (): Promise<Source[]> => {
  const { data, error } = await supabase.from('sources').select('id, slug, name, sort_order').order('sort_order');
  if (error) {
    console.error('Error fetching sources:', error);
    return [];
  }
  return data as Source[];
});

export interface LibraryItem {
  id: number;
  title: string;
  summary: string | null;
  video_id: string | null;
  content_type: string | null;
  main_category: string;
  sub_category: string | null;
  publish_date: string | null;
  series_id: number | null;
  source_id: number | null;
  media_types: MediaType[];
}

function rpcArgs(state: LibraryState, sourceId: number | undefined, types?: MediaType[]) {
  return {
    p_node: state.topic ?? null,
    p_types: types ?? (state.type ? [state.type] : null),
    p_source: sourceId ?? null,
    p_q: state.q?.trim() || null,
    // Only sent when set, so the call also works before migration 005 (no p_sa there).
    ...(state.sa && state.type === 'qa' ? { p_sa: state.sa } : {}),
  };
}

/**
 * One page of results. `limit`/`types` let the home page rows ask for a few items of several
 * types (the library itself filters by one type).
 */
export async function getLibraryItems(
  state: LibraryState,
  sourceId?: number,
  { limit = LIBRARY_PAGE_SIZE, types }: { limit?: number; types?: MediaType[] } = {},
): Promise<{ items: LibraryItem[]; total: number }> {
  const sort = effectiveSort(state);
  const base = { ...rpcArgs(state, sourceId, types), p_limit: limit, p_offset: (state.page - 1) * limit };
  let res = await supabase.rpc('library_items', { ...base, p_sort: sort === 'relevance' ? 'daily' : sort, p_seed: dailySeed() });
  // Before migration 006 the function has no p_sort/p_seed (newest-first order then), and
  // before 005 no p_sa: step back to the older calls rather than show an empty page.
  if (res.error?.code === 'PGRST202') res = await supabase.rpc('library_items', base);
  if (res.error?.code === 'PGRST202') {
    const { p_sa: _sa, ...old } = base as typeof base & { p_sa?: string };
    res = await supabase.rpc('library_items', old);
  }
  if (res.error) {
    console.error('Error fetching library items:', res.error);
    return { items: [], total: 0 };
  }
  const rows = (res.data || []) as (LibraryItem & { total: number })[];
  return { items: rows.map(({ total: _total, ...item }) => item), total: Number(rows[0]?.total ?? 0) };
}

export interface LibraryFacets {
  types: Partial<Record<MediaType, number>>;
  sources: Map<number, number>;
  sa: Map<string, number>;
  nodes: Map<number, number>;
  total: number;
}

/** Counts per option of each axis, with the other axes' filters applied. */
export async function getLibraryFacets(state: LibraryState, sourceId?: number): Promise<LibraryFacets> {
  const facets: LibraryFacets = { types: {}, sources: new Map(), sa: new Map(), nodes: new Map(), total: 0 };
  const { data, error } = await supabase.rpc('library_facets', rpcArgs(state, sourceId));
  if (error) {
    console.error('Error fetching library facets:', error);
    return facets;
  }
  for (const { facet, key, item_count } of (data || []) as { facet: string; key: string | null; item_count: number }[]) {
    const n = Number(item_count);
    if (facet === 'type' && isMediaType(key)) facets.types[key] = n;
    else if (facet === 'source') facets.sources.set(Number(key), n);
    else if (facet === 'sa' && key) facets.sa.set(key, n);
    else if (facet === 'node') facets.nodes.set(Number(key), n);
    else if (facet === 'total') facets.total = n;
  }
  return facets;
}

/** The curated tree with the library's counts; nodes without results are dropped. */
export function treeWithCounts(tree: FilterNode[], counts: Map<number, number>): FilterNode[] {
  return tree
    .map((n) => ({ ...n, count: counts.get(n.id) ?? 0, children: treeWithCounts(n.children, counts) }))
    .filter((n) => n.count > 0);
}
