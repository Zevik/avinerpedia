import { cache } from 'react';
import { supabase } from './supabase';
import type { ContentItem, Series, Topic, TopicNode } from './types';

/**
 * Queries for the series and topic taxonomy imported from the source wiki
 * (tables from supabase/migrations/002_taxonomy.sql).
 */

export type EpisodeSummary = Pick<ContentItem, 'id' | 'title' | 'series_order' | 'video_id' | 'summary'>;

export async function getAllSeries(): Promise<(Series & { firstEpisodeId: number | null })[]> {
  const { data: series, error } = await supabase
    .from('series')
    .select('id, name, detected_by, episode_count')
    .order('episode_count', { ascending: false });

  if (error) {
    console.error('Error fetching series:', error);
    return [];
  }

  const { data: firsts } = await supabase
    .from('content_items')
    .select('id, series_id')
    .eq('series_order', 1)
    .eq('is_active', true)
    .in('series_id', series.map((s) => s.id));

  const firstBySeries = new Map((firsts || []).map((f) => [f.series_id, f.id]));
  return series.map((s) => ({ ...s, firstEpisodeId: firstBySeries.get(s.id) ?? null }));
}

export async function getSeriesWithEpisodes(id: number): Promise<{ series: Series; episodes: EpisodeSummary[] } | null> {
  const { data: series, error } = await supabase
    .from('series')
    .select('id, name, detected_by, episode_count')
    .eq('id', id)
    .maybeSingle();

  if (error || !series) {
    if (error) console.error('Error fetching series:', error);
    return null;
  }

  const { data: episodes, error: epError } = await supabase
    .from('content_items')
    .select('id, title, series_order, video_id, summary')
    .eq('series_id', id)
    .eq('is_active', true)
    .order('series_order', { ascending: true });

  if (epError) console.error('Error fetching episodes:', epError);
  return { series, episodes: episodes || [] };
}

/** The series an item belongs to, with the previous and next active episodes. */
export async function getSeriesNavigation(item: Pick<ContentItem, 'series_id' | 'series_order'>) {
  if (!item.series_id || item.series_order == null) return null;

  const [seriesRes, prevRes, nextRes] = await Promise.all([
    supabase.from('series').select('id, name, episode_count').eq('id', item.series_id).maybeSingle(),
    supabase
      .from('content_items')
      .select('id, title, series_order')
      .eq('series_id', item.series_id)
      .eq('is_active', true)
      .lt('series_order', item.series_order)
      .order('series_order', { ascending: false })
      .limit(1),
    supabase
      .from('content_items')
      .select('id, title, series_order')
      .eq('series_id', item.series_id)
      .eq('is_active', true)
      .gt('series_order', item.series_order)
      .order('series_order', { ascending: true })
      .limit(1),
  ]);

  if (!seriesRes.data) return null;
  return {
    series: seriesRes.data,
    order: item.series_order,
    prev: prevRes.data?.[0] ?? null,
    next: nextRes.data?.[0] ?? null,
  };
}

/** Topics an item is tagged with, primary first. */
export async function getContentTopics(contentId: number): Promise<(Topic & { is_primary: boolean })[]> {
  const { data, error } = await supabase
    .from('content_topics')
    .select('is_primary, topics(id, name, depth, item_count)')
    .eq('content_id', contentId);

  if (error) {
    console.error('Error fetching content topics:', error);
    return [];
  }

  return (data || [])
    .flatMap((row) => {
      const topic = row.topics as unknown as Topic | null;
      return topic ? [{ ...topic, is_primary: row.is_primary }] : [];
    })
    .sort((a, b) => Number(b.is_primary) - Number(a.is_primary) || b.depth - a.depth);
}

async function fetchAllRows<T>(table: string, columns: string): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase.from(table).select(columns).range(from, from + 999);
    if (error) throw error;
    rows.push(...(data as T[]));
    if (data.length < 1000) return rows;
  }
}

/**
 * The whole topic tree (~900 topics), with each node's total item count
 * including its sub-topics. A topic can have several parents.
 * Cached per request: topic pages need it for both metadata and rendering.
 */
export const getTopicTree = cache(async (): Promise<Map<number, TopicNode>> => {
  const [topics, edges] = await Promise.all([
    fetchAllRows<Topic>('topics', 'id, name, depth, item_count'),
    fetchAllRows<{ topic_id: number; parent_id: number }>('topic_parents', 'topic_id, parent_id'),
  ]);

  const nodes = new Map<number, TopicNode>(
    topics.map((t) => [t.id, { ...t, parentIds: [], childIds: [], totalCount: t.item_count }]),
  );
  for (const e of edges) {
    nodes.get(e.topic_id)?.parentIds.push(e.parent_id);
    nodes.get(e.parent_id)?.childIds.push(e.topic_id);
  }

  // Total = own items + items of all descendants (each descendant counted once).
  for (const node of nodes.values()) {
    const seen = new Set<number>();
    const stack = [...node.childIds];
    while (stack.length) {
      const id = stack.pop()!;
      if (seen.has(id) || id === node.id) continue;
      seen.add(id);
      const child = nodes.get(id);
      if (child) {
        node.totalCount += child.item_count;
        stack.push(...child.childIds);
      }
    }
  }
  return nodes;
});

/**
 * Breadcrumb from a root down to the topic. Topics can have several parents, so the
 * first step follows `viaParent` (the page the visitor came from) when it is a real
 * parent, and each step after that follows the first parent.
 */
export function topicPath(tree: Map<number, TopicNode>, id: number, viaParent?: number): TopicNode[] {
  const path: TopicNode[] = [];
  const seen = new Set<number>();
  let node = tree.get(id);
  while (node && !seen.has(node.id)) {
    path.unshift(node);
    seen.add(node.id);
    const preferred = path.length === 1 && viaParent && node.parentIds.includes(viaParent) ? viaParent : node.parentIds[0];
    node = preferred ? tree.get(preferred) : undefined;
  }
  return path;
}

export const TOPIC_PAGE_SIZE = 30;

/** Active items tagged directly with a topic, newest first. */
export async function getTopicItems(topicId: number, page = 1): Promise<{ items: ContentItem[]; total: number }> {
  const from = (page - 1) * TOPIC_PAGE_SIZE;
  const { data, count, error } = await supabase
    .from('content_items')
    .select('*, content_topics!inner(topic_id)', { count: 'exact' })
    .eq('content_topics.topic_id', topicId)
    .eq('is_active', true)
    .order('publish_date', { ascending: false, nullsFirst: false })
    .order('id', { ascending: false })
    .range(from, from + TOPIC_PAGE_SIZE - 1);

  if (error) {
    console.error('Error fetching topic items:', error);
    return { items: [], total: 0 };
  }
  return { items: (data || []) as ContentItem[], total: count || 0 };
}
