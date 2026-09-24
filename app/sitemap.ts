import type { MetadataRoute } from 'next';
import { createClient } from '@supabase/supabase-js';
import { SITE_URL } from '@/lib/seo';
import { getTopicTree } from '@/lib/taxonomy';

// Rebuilt at most once a day; ~8,500 URLs, well under the 50,000-per-sitemap limit.
export const revalidate = 86400;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key',
);

async function fetchAll<T>(table: string, columns: string, filter?: (q: any) => any): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += 1000) {
    let query = supabase.from(table).select(columns).order('id').range(from, from + 999);
    if (filter) query = filter(query);
    const { data, error } = await query;
    if (error) throw new Error(`sitemap: ${table}: ${error.message}`);
    rows.push(...(data as T[]));
    if (data.length < 1000) return rows;
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const url = (path: string) => `${SITE_URL}${path}`;

  const hubs: MetadataRoute.Sitemap = [
    { url: url('/'), lastModified: now, changeFrequency: 'daily', priority: 1 },
    ...['/series', '/topics', '/videos', '/articles', '/qa'].map((path) => ({
      url: url(path),
      lastModified: now,
      changeFrequency: 'weekly' as const,
      priority: 0.9,
    })),
    { url: url('/french'), lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
  ];

  const [items, series, tree] = await Promise.all([
    fetchAll<{ id: number; updated_at: string | null; source_updated_at: string | null }>(
      'content_items',
      'id, updated_at, source_updated_at',
      (q) => q.eq('is_active', true),
    ),
    fetchAll<{ id: number }>('series', 'id'),
    getTopicTree(),
  ]);

  const seriesPages: MetadataRoute.Sitemap = series.map((s) => ({
    url: url(`/series/${s.id}`),
    changeFrequency: 'monthly',
    priority: 0.8,
  }));

  const topicPages: MetadataRoute.Sitemap = [...tree.values()]
    .filter((t) => t.totalCount > 0)
    .map((t) => ({
      url: url(`/topics/${t.id}`),
      changeFrequency: 'weekly',
      priority: t.parentIds.length === 0 ? 0.7 : 0.5,
    }));

  const contentPages: MetadataRoute.Sitemap = items.map((i) => ({
    url: url(`/content/${i.id}`),
    // The source wiki's last edit is the real content date; updated_at also moves on re-classification.
    lastModified: new Date(i.source_updated_at || i.updated_at || now),
    changeFrequency: 'yearly',
    priority: 0.6,
  }));

  return [...hubs, ...seriesPages, ...topicPages, ...contentPages];
}
