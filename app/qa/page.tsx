import { Suspense } from 'react';
export const dynamic = 'force-dynamic';
import { pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata({
  title: "שו\"ת הלכה - שאלות ותשובות עם הרב שלמה אבינר | אבינרפדיה",
  description: "שאלות ותשובות בהלכה ובאמונה עם הרב שלמה אבינר, מסודרות לפי נושאים: אורח חיים, יורה דעה, אבן העזר, חושן משפט ועוד.",
  path: '/qa',
});
import { FilterSidebar } from '@/components/FilterSidebar';
import { getContentItems, getSubCategories } from '@/lib/db';
import { InfiniteContentList } from '@/components/InfiniteContentList';
import type { ContentFilters } from '@/lib/types';

interface QAPageProps {
  searchParams: Promise<{ topic?: string }>;
}

export default async function QAPage({ searchParams }: QAPageProps) {
  const params = await searchParams;
  const selectedTopic = params.topic;

  const filters: ContentFilters = {
    main_category: 'שו"ת הלכה',
    sub_category: selectedTopic,
    limit: 50,
  };

  // Fetch Q&A items and categories
  const [qaItems, categories] = await Promise.all([
    getContentItems(filters),
    getSubCategories('שו"ת הלכה'),
  ]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20 py-8">
      <div className="container mx-auto px-4">
        <h1 className="text-4xl font-bold mb-8">שאלות ותשובות</h1>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar */}
          <div className="lg:w-64 flex-shrink-0">
            <Suspense fallback={<div>טוען...</div>}>
              <FilterSidebar
                categories={categories}
                currentCategory={selectedTopic}
                basePath="/qa"
              />
            </Suspense>
          </div>

          {/* Content List */}
          <div className="flex-1">
            {selectedTopic && (
              <div className="mb-6">
                <h2 className="text-2xl font-semibold text-muted-foreground">
                  {selectedTopic}
                </h2>
              </div>
            )}

            {/* key: the list keeps its items in state, so remount it when the topic changes. */}
            <InfiniteContentList
              key={selectedTopic ?? 'all'}
              initialItems={qaItems}
              filters={filters}
              type="qa"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
