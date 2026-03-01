import { Suspense } from 'react';
export const dynamic = 'force-dynamic';
import { FilterSidebar } from '@/components/FilterSidebar';
import { getContentItems, getSubCategories } from '@/lib/db';
import { InfiniteContentList } from '@/components/InfiniteContentList';
import type { ContentFilters } from '@/lib/types';

interface ArticlesPageProps {
  searchParams: Promise<{ topic?: string }>;
}

export default async function ArticlesPage({ searchParams }: ArticlesPageProps) {
  const params = await searchParams;
  const selectedTopic = params.topic;

  const filters: ContentFilters = {
    main_category: 'מאמרים',
    sub_category: selectedTopic,
    limit: 50,
  };

  // Fetch initial articles and categories
  const [articles, categories] = await Promise.all([
    getContentItems(filters),
    getSubCategories('מאמרים'),
  ]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20 py-8">
      <div className="container mx-auto px-4">
        <h1 className="text-4xl font-bold mb-8">מאמרים</h1>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar */}
          <div className="lg:w-64 flex-shrink-0">
            <Suspense fallback={<div>טוען...</div>}>
              <FilterSidebar
                categories={categories}
                currentCategory={selectedTopic}
                basePath="/articles"
              />
            </Suspense>
          </div>

          {/* Content Grid */}
          <div className="flex-1">
            {selectedTopic && (
              <div className="mb-6">
                <h2 className="text-2xl font-semibold text-muted-foreground">
                  {selectedTopic}
                </h2>
              </div>
            )}

            <InfiniteContentList
              initialItems={articles}
              filters={filters}
              type="article"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
