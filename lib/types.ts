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
  created_at: string;
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
}

// Type for series grouping (by sub_category)
export interface SeriesGroup {
  sub_category: string;
  sub_category_id?: number;
  title: string;
  count: number;
  items: ContentItem[];
}
