import { Suspense } from 'react';
export const dynamic = 'force-dynamic';
import Link from 'next/link';
import { Calendar, ArrowLeft } from 'lucide-react';
import { FilterSidebar } from '@/components/FilterSidebar';
import { getContentItems, getSubCategories } from '@/lib/db';

interface ArticlesPageProps {
  searchParams: Promise<{ topic?: string }>;
}

export default async function ArticlesPage({ searchParams }: ArticlesPageProps) {
  const params = await searchParams;
  const selectedTopic = params.topic;

  // Fetch articles and categories
  const [articles, categories] = await Promise.all([
    getContentItems({
      main_category: 'מאמרים',
      sub_category: selectedTopic,
      limit: 50,
    }),
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

            {articles.length > 0 ? (
              <div className="space-y-6 max-w-4xl">
                {articles.map((article) => (
                  <ArticleCard key={article.id} article={article} />
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <p className="text-xl text-muted-foreground">
                  לא נמצאו מאמרים
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ArticleCard({ article }: { article: any }) {
  // Helper to check if summary is valid content and not metadata
  const isValidSummary = (text: string) => {
    if (!text) return false;
    return !text.includes('catid=');
  };

  return (
    <Link
      href={`/content/${article.id}`}
      className="block bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow p-6"
    >
      <h2 className="text-2xl font-bold mb-3 hover:text-primary transition-colors">
        {article.title}
      </h2>

      {article.summary && isValidSummary(article.summary) && (
        <p className="text-muted-foreground mb-4 line-clamp-3">
          {article.summary}
        </p>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4 space-x-reverse text-sm text-muted-foreground">
          {article.publish_date && (
            <div className="flex items-center space-x-2 space-x-reverse">
              <Calendar className="w-4 h-4" />
              <span>{new Date(article.publish_date).toLocaleDateString('he-IL')}</span>
            </div>
          )}
          {article.sub_category && (
            <span className="px-2 py-1 bg-secondary rounded-full text-xs">
              {article.sub_category}
            </span>
          )}
        </div>

        <div className="flex items-center space-x-2 space-x-reverse text-primary font-semibold">
          <span>קרא עוד</span>
          <ArrowLeft className="w-4 h-4" />
        </div>
      </div>
    </Link>
  );
}
