import { Suspense } from 'react';
export const dynamic = 'force-dynamic';
import { FilterSidebar } from '@/components/FilterSidebar';
import { getContentItems, getSubCategories } from '@/lib/db';
import { InfiniteContentList } from '@/components/InfiniteContentList';
import type { ContentFilters } from '@/lib/types';

interface VideosPageProps {
  searchParams: Promise<{ topic?: string }>;
}

export default async function VideosPage({ searchParams }: VideosPageProps) {
  const params = await searchParams;
  const selectedTopic = params.topic;

  const filters: ContentFilters = {
    main_category: 'סרטונים',
    sub_category_id: selectedTopic ? parseInt(selectedTopic) : undefined,
    has_video: true,
    limit: 50,
  };

  // Fetch initial videos and categories
  const [videos, categories] = await Promise.all([
    getContentItems(filters),
    getSubCategories('סרטונים'),
  ]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20 py-8">
      <div className="container mx-auto px-4">
        <h1 className="text-4xl font-bold mb-8">סרטונים</h1>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar */}
          <div className="lg:w-64 flex-shrink-0">
            <Suspense fallback={<div>טוען...</div>}>
              <FilterSidebar
                categories={categories}
                currentCategory={selectedTopic}
                basePath="/videos"
              />
            </Suspense>
          </div>

          {/* Content Grid */}
          <div className="flex-1">
            <InfiniteContentList
              initialItems={videos}
              filters={filters}
              type="video"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
