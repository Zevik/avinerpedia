import { supabase } from './supabase';
import { ContentItem, ContentFilters, MainCategory } from './types';

/**
 * Fetch content items with optional filtering
 */
export async function getContentItems(filters?: ContentFilters): Promise<ContentItem[]> {
  let query = supabase
    .from('content_items')
    .select('*')
    .order('created_at', { ascending: false });

  if (filters?.main_category) {
    query = query.eq('main_category', filters.main_category);
  }

  if (filters?.sub_category) {
    query = query.eq('sub_category', filters.sub_category);
  }

  if (filters?.search) {
    query = query.or(`title.ilike.%${filters.search}%,content_md.ilike.%${filters.search}%`);
  }

  // Filter out items without content
  // Videos and Series can have video_id instead of content_md
  if (filters?.main_category === 'מאמרים' || filters?.main_category === 'שו"ת הלכה') {
    // Articles and Q&A must have content_md
    query = query.not('content_md', 'is', null).neq('content_md', '');
  }
  // For other categories (videos/series), we don't filter - they can have video_id

  if (filters?.limit) {
    query = query.limit(filters.limit);
  }

  if (filters?.offset) {
    query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching content items:', error);
    throw error;
  }

  return data || [];
}

/**
 * Fetch a single content item by ID
 */
export async function getContentItemById(id: number): Promise<ContentItem | null> {
  const { data, error } = await supabase
    .from('content_items')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching content item:', error);
    return null;
  }

  return data;
}

/**
 * Fetch latest items for homepage hero section
 */
export async function getLatestArticle(): Promise<ContentItem | null> {
  const { data, error } = await supabase
    .from('content_items')
    .select('*')
    .eq('main_category', 'מאמרים')
    .not('content_md', 'is', null)
    .neq('content_md', '')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error) {
    console.error('Error fetching latest article:', error);
    return null;
  }

  return data;
}

/**
 * Fetch latest videos for homepage carousel
 */
export async function getLatestVideos(limit: number = 12): Promise<ContentItem[]> {
  return getContentItems({
    main_category: 'סרטונים',
    limit,
  });
}

/**
 * Fetch series grouped by sub_category
 * Returns the largest series by item count (not by date)
 */
export async function getSeriesGroups(limit: number = 8) {
  // Get ALL series to count them properly
  const { data, error } = await supabase
    .from('content_items')
    .select('sub_category, title, id')
    .eq('main_category', 'סדרות')
    .not('sub_category', 'is', null);

  if (error) {
    console.error('Error fetching series:', error);
    return [];
  }

  // Group by sub_category and count
  const grouped = data.reduce((acc, item) => {
    const key = item.sub_category!;
    if (!acc[key]) {
      acc[key] = {
        sub_category: key,
        title: key,
        count: 0,
        items: [],
      };
    }
    acc[key].count++;
    acc[key].items.push(item as ContentItem);
    return acc;
  }, {} as Record<string, any>);

  // Sort by count (largest series first) and return top N
  return Object.values(grouped)
    .sort((a: any, b: any) => b.count - a.count)
    .slice(0, limit);
}

/**
 * Fetch latest Q&A items for homepage
 */
export async function getLatestQA(limit: number = 10): Promise<ContentItem[]> {
  return getContentItems({
    main_category: 'שו"ת הלכה',
    limit,
  });
}

/**
 * Get unique sub-categories for filtering
 */
export async function getSubCategories(mainCategory: MainCategory): Promise<string[]> {
  const { data, error } = await supabase
    .from('content_items')
    .select('sub_category')
    .eq('main_category', mainCategory)
    .not('sub_category', 'is', null);

  if (error) {
    console.error('Error fetching sub-categories:', error);
    return [];
  }

  const unique = [...new Set(data.map(item => item.sub_category))].filter(Boolean) as string[];
  return unique.sort();
}

/**
 * Full-text search using PostgreSQL FTS
 */
export async function searchContent(query: string, limit: number = 20): Promise<ContentItem[]> {
  const { data, error } = await supabase
    .from('content_items')
    .select('*')
    .textSearch('fts', query, {
      type: 'websearch',
      config: 'simple',
    })
    .limit(limit);

  if (error) {
    console.error('Error searching content:', error);
    return [];
  }

  return data || [];
}

/**
 * Fetch wiki posts from the posts table
 */
export async function getWikiPosts(limit: number = 50, offset: number = 0, categoryId?: string) {
  let query = supabase
    .from('posts')
    .select('id, title, slug, category_id, created_at')
    .eq('status', 'published')
    .order('created_at', { ascending: false });

  if (categoryId) {
    query = query.eq('category_id', categoryId);
  }

  const { data, error } = await query.range(offset, offset + limit - 1);

  if (error) {
    console.error('Error fetching wiki posts:', error);
    return [];
  }

  return data || [];
}

/**
 * Fetch all categories for the wiki
 */
export async function getWikiCategories() {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('name');

  if (error) {
    console.error('Error fetching categories:', error);
    return [];
  }

  return data || [];
}
