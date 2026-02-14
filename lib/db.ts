import { supabase } from './supabase';
import { ContentItem, ContentFilters, MainCategory } from './types';

/**
 * Fetch content items with optional filtering
 */
/**
 * Fetch all categories (hierarchical)
 */
export async function getCategories() {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('display_order', { ascending: true })
    .order('name', { ascending: true });

  if (error) {
    console.error('Error fetching categories:', error);
    return { main: [], sub: [] };
  }

  const main = data.filter(c => c.type === 'main');
  const sub = data.filter(c => c.type === 'sub');

  return { main, sub, all: data };
}

/**
 * Filter items by category ID
 */
export async function getContentItems(filters?: ContentFilters): Promise<ContentItem[]> {
  let query = supabase
    .from('content_items')
    .select('*')
    .order('created_at', { ascending: false });

  // Support both legacy string filtering and new ID filtering
  if (filters?.main_category_id) {
    query = query.eq('main_category_id', filters.main_category_id);
  } else if (filters?.main_category) {
    query = query.eq('main_category', filters.main_category);
  }

  if (filters?.sub_category_id) {
    query = query.eq('sub_category_id', filters.sub_category_id);
  } else if (filters?.sub_category) {
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
    .select(`
      *,
      main_category_ref:categories!main_category_id(id, name),
      sub_category_ref:categories!sub_category_id(id, name, parent_id)
    `)
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
  // We prefer using ID if available, otherwise string fallback
  const { data, error } = await supabase
    .from('content_items')
    .select('sub_category, sub_category_id, title, id')
    .eq('main_category', 'סדרות')
    .not('sub_category', 'is', null);

  if (error) {
    console.error('Error fetching series:', error);
    return [];
  }

  // Group by sub_category and count
  const grouped = data.reduce((acc, item) => {
    // Use ID as key if available (safer), otherwise string
    const key = item.sub_category_id ? `id_${item.sub_category_id}` : item.sub_category!;

    if (!acc[key]) {
      acc[key] = {
        sub_category: item.sub_category!,
        sub_category_id: item.sub_category_id,
        title: item.sub_category!, // Display title is the sub-cat name
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
  // Try to get from categories table first (cleaner source)
  const { data: catData, error: catError } = await supabase
    .from('categories')
    .select('name, parent_id')
    .eq('type', 'sub');

  if (!catError && catData && catData.length > 0) {
    // We need to filter by main_category, but sub-cats link to parent ID, not name.
    // So we first find the main category ID.
    const { data: mainCat } = await supabase
      .from('categories')
      .select('id')
      .eq('name', mainCategory)
      .eq('type', 'main')
      .single();

    if (mainCat) {
      return catData
        .filter(c => c.parent_id === mainCat.id)
        .map(c => c.name)
        .sort();
    }
  }

  // Fallback to existing logic if categories table is empty or main cat not found
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
 * Category Management Functions
 */

export async function createCategory(category: { name: string, type: 'main' | 'sub', parent_id?: number | null }) {
  const { data, error } = await supabase
    .from('categories')
    .insert(category)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateCategory(id: number, updates: { name?: string, parent_id?: number | null, display_order?: number }) {
  const { data, error } = await supabase
    .from('categories')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteCategory(id: number) {
  const { error } = await supabase
    .from('categories')
    .delete()
    .eq('id', id);

  if (error) throw error;
  return true;
}

export async function updateContentCategory(contentId: number, mainCatId: number, subCatId?: number) {
  // Retrieve names first to keep string columns in sync
  const { data: mainCat } = await supabase.from('categories').select('name').eq('id', mainCatId).single();
  let subCatName = null;

  if (subCatId) {
    const { data: subCat } = await supabase.from('categories').select('name').eq('id', subCatId).single();
    if (subCat) subCatName = subCat.name;
  }

  const { data, error } = await supabase
    .from('content_items')
    .update({
      main_category_id: mainCatId,
      sub_category_id: subCatId,
      main_category: mainCat?.name, // Keep legacy sync
      sub_category: subCatName      // Keep legacy sync
    })
    .eq('id', contentId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

