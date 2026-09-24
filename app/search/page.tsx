import { Suspense } from 'react';
export const dynamic = 'force-dynamic';
import { pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata({
  title: "חיפוש | אבינרפדיה",
  description: "חיפוש בכל שיעורי הרב שלמה אבינר.",
  path: '/search',
  // Result pages are endless near-duplicates; keep them out of the index but follow links.
  noindex: true,
});
import Link from 'next/link';
import { Search as SearchIcon } from 'lucide-react';
import { VideoCard } from '@/components/VideoCard';
import { QAListItem } from '@/components/QAListItem';
import { searchContent } from '@/lib/db';

interface SearchPageProps {
  searchParams: Promise<{ q?: string }>;
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams;
  const query = params.q || '';

  const results = query ? await searchContent(query, 50) : [];

  // Group results by category
  const videos = results.filter(item => item.main_category === 'סרטונים');
  const qa = results.filter(item => item.main_category === 'שו"ת הלכה');
  const articles = results.filter(item => item.main_category === 'מאמרים');
  const series = results.filter(item => item.main_category === 'סדרות');

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20 py-8">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-4">חיפוש</h1>
          {query && (
            <p className="text-xl text-muted-foreground">
              תוצאות עבור: <span className="font-semibold text-foreground">{query}</span>
            </p>
          )}
        </div>

        {!query ? (
          <div className="text-center py-16">
            <SearchIcon className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <p className="text-xl text-muted-foreground">
              הזן מילת חיפוש למציאת תוכן
            </p>
          </div>
        ) : results.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-xl text-muted-foreground">
              לא נמצאו תוצאות
            </p>
          </div>
        ) : (
          <div className="space-y-12">
            {/* Videos */}
            {videos.length > 0 && (
              <section>
                <h2 className="text-2xl font-bold mb-6">סרטונים ({videos.length})</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {videos.map(video => (
                    <VideoCard key={video.id} item={video} />
                  ))}
                </div>
              </section>
            )}

            {/* Q&A */}
            {qa.length > 0 && (
              <section>
                <h2 className="text-2xl font-bold mb-6">שאלות ותשובות ({qa.length})</h2>
                <div className="space-y-4">
                  {qa.map(item => (
                    <QAListItem key={item.id} item={item} />
                  ))}
                </div>
              </section>
            )}

            {/* Articles */}
            {articles.length > 0 && (
              <section>
                <h2 className="text-2xl font-bold mb-6">מאמרים ({articles.length})</h2>
                <div className="space-y-4">
                  {articles.map(article => (
                    <ArticleSearchResult key={article.id} article={article} />
                  ))}
                </div>
              </section>
            )}

            {/* Series */}
            {series.length > 0 && (
              <section>
                <h2 className="text-2xl font-bold mb-6">סדרות ({series.length})</h2>
                <div className="space-y-4">
                  {series.map(item => (
                    <ArticleSearchResult key={item.id} article={item} />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ArticleSearchResult({ article }: { article: any }) {
  return (
    <Link
      href={`/content/${article.id}`}
      className="block bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow p-6"
    >
      <h3 className="text-xl font-bold mb-2 hover:text-primary transition-colors">
        {article.title}
      </h3>
      {article.summary && (
        <p className="text-muted-foreground line-clamp-2">
          {article.summary}
        </p>
      )}
      {article.sub_category && (
        <span className="inline-block mt-3 px-2 py-1 bg-secondary rounded-full text-xs">
          {article.sub_category}
        </span>
      )}
    </Link>
  );
}
