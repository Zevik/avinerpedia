import { cache } from 'react';
import { supabase } from './supabase';
import type { FilterNode } from './types';

/**
 * The curated filter tree (supabase/migrations/003_filter_tree.sql, built from
 * docs/TOPIC_TAXONOMY_DRAFT.md) with item counts for one page.
 */

/**
 * Count dimension per page: a main_category, '__has_video' for /videos, or 'all' for the
 * topic pages (every active item: the sum over main categories).
 */
export type FilterScope = 'סרטונים' | 'מאמרים' | 'שו"ת הלכה' | '__has_video' | 'all';

const SEP = ' › ';

/** URL of a node's topic page: its path as segments, e.g. /topics/חגים ומועדים/חנוכה. */
export function nodeHref(path: string): string {
  return '/topics/' + path.split(SEP).map(encodeURIComponent).join('/');
}

/** The node whose path matches the (decoded) URL segments, with its ancestors. */
export function findNodeBySegments(tree: FilterNode[], segments: string[]): FilterNode[] {
  const out: FilterNode[] = [];
  let level = tree;
  for (const seg of segments) {
    const node = level.find((n) => n.name === seg);
    if (!node) return [];
    out.push(node);
    level = node.children;
  }
  return out;
}

/** All nodes of a tree, depth-first. */
export function flattenTree(tree: FilterNode[]): FilterNode[] {
  return tree.flatMap((n) => [n, ...flattenTree(n.children)]);
}

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
  const countsQuery = supabase.from('filter_node_counts').select('node_id, item_count');
  const [nodesRes, countsRes] = await Promise.all([
    supabase.from('filter_nodes').select('id, path, name, parent_id, depth, sort_order').order('depth').order('sort_order'),
    scope === 'all' ? countsQuery.neq('main_category', '__has_video').limit(5000) : countsQuery.eq('main_category', scope),
  ]);
  if (nodesRes.error || countsRes.error) {
    console.error('Error fetching filter tree:', nodesRes.error || countsRes.error);
    return [];
  }

  // For 'all', a node's count is the sum over the main categories.
  const counts = new Map<number, number>();
  for (const c of countsRes.data || []) counts.set(c.node_id, (counts.get(c.node_id) || 0) + c.item_count);
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

/**
 * The curated nodes an item is filed under, most specific only (content_filter_nodes also
 * holds every ancestor; a node that is the ancestor of another linked node is dropped).
 * The item's primary node comes first.
 */
export async function getContentNodes(contentId: number, primaryNodeId?: number | null): Promise<{ path: string; name: string; primary: boolean }[]> {
  const { data, error } = await supabase
    .from('content_filter_nodes')
    .select('filter_nodes(id, path, name)')
    .eq('content_id', contentId);
  if (error) {
    console.error('Error fetching content nodes:', error);
    return [];
  }
  const nodes = (data || []).flatMap((r) => {
    const n = r.filter_nodes as unknown as { id: number; path: string; name: string } | null;
    return n ? [n] : [];
  });
  const leaves = nodes.filter((n) => !nodes.some((o) => o.path.startsWith(n.path + SEP)));
  return leaves
    .map((n) => ({ path: n.path, name: n.name, primary: n.id === primaryNodeId }))
    .sort((a, b) => Number(b.primary) - Number(a.primary) || b.path.split(SEP).length - a.path.split(SEP).length);
}
