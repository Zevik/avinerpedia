/**
 * TypeScript type definitions for Avinerpedia content items
 * Based on the Supabase database schema
 */

export type MainCategory = 'סרטונים' | 'מאמרים' | 'שו"ת הלכה' | 'סדרות';

export interface Category {
  id: number;
  name: string;
  type: 'main' | 'sub';
  parent_id: number | null;
  display_order: number;
  created_at: string;
}

export interface ContentItem {
  id: number;
  original_id: number | null;
  title: string;
  main_category: MainCategory; // Keeping for backward compatibility/display
  sub_category: string | null; // Keeping for backward compatibility/display
  main_category_id: number | null;
  sub_category_id: number | null;
  video_id: string | null;
  publish_date: string | null;
  summary: string | null;
  original_tags: string | null;
  content_md: string | null;
  is_active: boolean;
  created_at: string;
  // Taxonomy from the source wiki (supabase/migrations/002_taxonomy.sql)
  source_page_id?: number | null;
  content_type?: 'video' | 'article' | 'qa' | 'series' | 'french' | null;
  root_topic?: string | null;
  series_id?: number | null;
  series_order?: number | null;
  // Curated filter tree (supabase/migrations/003_filter_tree.sql)
  primary_node_id?: number | null;
  sa_section?: string | null;
  source_collection?: string | null;
}

export interface Series {
  id: number;
  name: string;
  detected_by: string;
  episode_count: number;
}

export interface Topic {
  id: number;
  name: string;
  depth: number;
  item_count: number;
}


export interface VideoItem extends ContentItem {
  main_category: 'סרטונים';
  video_id: string;
}

export interface ArticleItem extends ContentItem {
  main_category: 'מאמרים';
}

export interface QAItem extends ContentItem {
  main_category: 'שו"ת הלכה';
}

export interface SeriesItem extends ContentItem {
  main_category: 'סדרות';
}

// Utility type for filtering
export interface ContentFilters {
  main_category?: MainCategory;
  sub_category?: string;
  main_category_id?: number;
  sub_category_id?: number;
  search?: string;
  limit?: number;
  offset?: number;
  has_video?: boolean;
  include_inactive?: boolean;
  /** Curated filter tree node (supabase/migrations/003_filter_tree.sql); includes descendants. */
  node_id?: number;
  /** Q&A Shulchan Aruch section (אורח חיים / יורה דעה / אבן העזר / חושן משפט). */
  sa_section?: string;
}

/** A node of the curated filter tree with its active item count for the current page. */
export interface FilterNode {
  id: number;
  path: string;
  name: string;
  parent_id: number | null;
  depth: number;
  sort_order: number;
  count: number;
  children: FilterNode[];
}

// Type for series grouping (by sub_category)
export interface SeriesGroup {
  sub_category: string;
  sub_category_id?: number;
  title: string;
  count: number;
  items: ContentItem[];
}
