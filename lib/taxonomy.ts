import { supabase } from './supabase';
import type { ContentItem, Series } from './types';

/**
 * Queries for series (supabase/migrations/002_taxonomy.sql). Topic queries use the
 * curated filter tree in lib/filters.ts.
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
