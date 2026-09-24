import { cache } from 'react';
import { supabase } from './supabase';
import type { FilterNode } from './types';

/**
 * The curated filter tree (supabase/migrations/003_filter_tree.sql, built from
 * docs/TOPIC_TAXONOMY_DRAFT.md) with item counts for one page.
 */

/** Count dimension per page: a main_category, or '__has_video' for /videos. */
export type FilterScope = 'סרטונים' | 'מאמרים' | 'שו"ת הלכה' | '__has_video';

export const SA_SECTIONS = ['אורח חיים', 'יורה דעה', 'אבן העזר', 'חושן משפט'] as const;

interface NodeRow {
  id: number;
  path: string;
  name: string;
  parent_id: number | null;
  depth: number;
  sort_order: number;
}

/** Nested tree of nodes that have items on this page, in curated order, with counts. */
export const getFilterTree = cache(async (scope: FilterScope): Promise<FilterNode[]> => {
  const [nodesRes, countsRes] = await Promise.all([
    supabase.from('filter_nodes').select('id, path, name, parent_id, depth, sort_order').order('depth').order('sort_order'),
    supabase.from('filter_node_counts').select('node_id, item_count').eq('main_category', scope),
  ]);
  if (nodesRes.error || countsRes.error) {
    console.error('Error fetching filter tree:', nodesRes.error || countsRes.error);
    return [];
  }

  const counts = new Map((countsRes.data || []).map((c) => [c.node_id, c.item_count]));
  const byId = new Map<number, FilterNode>();
  for (const n of (nodesRes.data || []) as NodeRow[]) {
    const count = counts.get(n.id) || 0;
    if (count > 0) byId.set(n.id, { ...n, count, children: [] });
  }

  const roots: FilterNode[] = [];
  for (const node of byId.values()) {
    const parent = node.parent_id ? byId.get(node.parent_id) : undefined;
    if (parent) parent.children.push(node);
    else if (node.depth === 0) roots.push(node);
  }
  const sortTree = (nodes: FilterNode[]) => {
    nodes.sort((a, b) => a.sort_order - b.sort_order);
    nodes.forEach((n) => sortTree(n.children));
  };
  sortTree(roots);
  return roots;
});

/** Finds a node by id in a tree, with its ancestors (root first). */
export function findNodePath(tree: FilterNode[], id: number): FilterNode[] {
  for (const node of tree) {
    if (node.id === id) return [node];
    const below = findNodePath(node.children, id);
    if (below.length) return [node, ...below];
  }
  return [];
}

/**
 * Resolves the `?topic=` parameter: a node id, or (for old links) a node name.
 */
export function resolveTopicParam(tree: FilterNode[], param: string | undefined): FilterNode | null {
  if (!param) return null;
  const asId = Number(param);
  if (Number.isInteger(asId) && asId > 0) return findNodePath(tree, asId).at(-1) ?? null;
  const stack = [...tree];
  while (stack.length) {
    const n = stack.shift()!;
    if (n.name === param) return n;
    stack.push(...n.children);
  }
  return null;
}

/** Q&A counts per Shulchan Aruch section (for the second filter axis on /qa). */
export const getSaSectionCounts = cache(async (): Promise<{ section: string; count: number }[]> => {
  const results = await Promise.all(
    SA_SECTIONS.map(async (section) => {
      const { count } = await supabase
        .from('content_items')
        .select('id', { count: 'exact', head: true })
        .eq('main_category', 'שו"ת הלכה')
        .eq('is_active', true)
        .eq('sa_section', section);
      return { section, count: count || 0 };
    }),
  );
  return results.filter((r) => r.count > 0);
});
