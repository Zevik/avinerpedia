import { cache } from 'react';
import { supabase } from './supabase';
import type { FilterNode } from './types';
import { isMediaType, LIBRARY_PAGE_SIZE, type LibraryState, type MediaType } from './library-url';

export * from './library-url';

/**
 * The content library (/library, and /videos /articles /qa as presets of it): all content,
 * filtered along three axes — topic (curated filter tree), media type and source — plus a
 * search box and, for Q&A, the Shulchan Aruch section. Queries run in Postgres
 * (supabase/migrations/004_library.sql, 005_library_sa.sql).
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

function rpcArgs(state: LibraryState, sourceId: number | undefined) {
  return {
    p_node: state.topic ?? null,
    p_types: state.type ? [state.type] : null,
    p_source: sourceId ?? null,
    p_q: state.q?.trim() || null,
    // Only sent when set, so the call also works before migration 005 (no p_sa there).
    ...(state.sa && state.type === 'qa' ? { p_sa: state.sa } : {}),
  };
}

export async function getLibraryItems(state: LibraryState, sourceId?: number): Promise<{ items: LibraryItem[]; total: number }> {
  const { data, error } = await supabase.rpc('library_items', {
    ...rpcArgs(state, sourceId),
    p_limit: LIBRARY_PAGE_SIZE,
    p_offset: (state.page - 1) * LIBRARY_PAGE_SIZE,
  });
  if (error) {
    console.error('Error fetching library items:', error);
    return { items: [], total: 0 };
  }
  const rows = (data || []) as (LibraryItem & { total: number })[];
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
