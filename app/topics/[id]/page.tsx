import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
export const dynamic = 'force-dynamic';
import { pageMetadata } from '@/lib/seo';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { ArticleCard } from '@/components/ArticleCard';
import { getTopicItems, getTopicTree, topicPath, TOPIC_PAGE_SIZE } from '@/lib/taxonomy';
import type { TopicNode } from '@/lib/types';

interface TopicPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string; from?: string }>;
}

export async function generateMetadata({ params }: Pick<TopicPageProps, 'params'>): Promise<Metadata> {
  const { id } = await params;
  const topic = (await getTopicTree()).get(Number(id));
  if (!topic) return { title: 'הדף לא נמצא | אבינרפדיה', robots: { index: false } };

  return pageMetadata({
    title: `${topic.name} - שיעורים ומאמרים | הרב שלמה אבינר`,
    description: `${topic.totalCount} שיעורים, מאמרים ושאלות ותשובות בנושא ${topic.name} מאת הרב שלמה אבינר.`,
    // Canonical without ?from= / ?page=, which only change the breadcrumb and paging.
    path: `/topics/${topic.id}`,
  });
}

export default async function TopicPage({ params, searchParams }: TopicPageProps) {
  const { id } = await params;
  const query = await searchParams;
  const page = Math.max(1, Number(query.page) || 1);
  const topicId = Number(id);

  const [tree, { items, total }] = await Promise.all([getTopicTree(), getTopicItems(topicId, page)]);
  const topic = tree.get(topicId);
  if (!topic) notFound();

  const path = topicPath(tree, topicId, Number(query.from) || undefined);
  const children = topic.childIds
    .map((cid) => tree.get(cid))
    .filter((c): c is TopicNode => !!c && c.totalCount > 0)
    .sort((a, b) => b.totalCount - a.totalCount || a.name.localeCompare(b.name, 'he'));
  // Other parents than the one shown in the breadcrumb.
  const shownParent = path.at(-2)?.id;
  const alsoUnder = topic.parentIds.filter((pid) => pid !== shownParent).map((pid) => tree.get(pid)).filter((p): p is TopicNode => !!p);
  const pages = Math.ceil(total / TOPIC_PAGE_SIZE);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20 py-8">
      <div className="container mx-auto px-4 max-w-5xl">
        <nav aria-label="פירורי לחם" className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground mb-4">
          <Link href="/topics" className="hover:text-primary">נושאים</Link>
          {path.slice(0, -1).map((p) => (
            <span key={p.id} className="flex items-center gap-1">
              <ChevronLeft className="w-4 h-4" />
              <Link href={`/topics/${p.id}`} className="hover:text-primary">{p.name}</Link>
            </span>
          ))}
        </nav>

        <h1 className="text-4xl font-bold mb-2">{topic.name}</h1>
        <p className="text-muted-foreground mb-8">
          {topic.totalCount} פריטים
          {alsoUnder.length > 0 && (
            <>
              {' · גם תחת: '}
              {alsoUnder.map((p, i) => (
                <span key={p.id}>
                  {i > 0 && ', '}
                  <Link href={`/topics/${p.id}`} className="text-primary hover:underline">{p.name}</Link>
                </span>
              ))}
            </>
          )}
        </p>

        {children.length > 0 && (
          <section className="mb-10">
            <h2 className="text-xl font-bold mb-4">תתי-נושאים</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {children.map((c) => (
                <Link
                  key={c.id}
                  href={`/topics/${c.id}?from=${topic.id}`}
                  className="flex items-center justify-between gap-2 bg-white rounded-lg shadow-sm hover:shadow-md p-3 transition-shadow"
                >
                  <span className="font-medium line-clamp-2">{c.name}</span>
                  <span className="text-sm text-muted-foreground flex-shrink-0">{c.totalCount}</span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {items.length > 0 && (
          <section>
            {children.length > 0 && <h2 className="text-xl font-bold mb-4">תכנים בנושא {topic.name}</h2>}
            <div className="space-y-6">
              {items.map((item) => (
                <ArticleCard key={item.id} article={item} />
              ))}
            </div>

            {pages > 1 && (
              <nav aria-label="עמודים" className="flex items-center justify-center gap-4 mt-10">
                {page > 1 && (
                  <Link href={`/topics/${topicId}?page=${page - 1}${query.from ? `&from=${query.from}` : ''}`} className="px-4 py-2 rounded-full border-2 border-primary text-primary hover:bg-primary hover:text-white transition-colors">
                    הקודם
                  </Link>
                )}
                <span className="text-muted-foreground">עמוד {page} מתוך {pages}</span>
                {page < pages && (
                  <Link href={`/topics/${topicId}?page=${page + 1}${query.from ? `&from=${query.from}` : ''}`} className="px-4 py-2 rounded-full border-2 border-primary text-primary hover:bg-primary hover:text-white transition-colors">
                    הבא
                  </Link>
                )}
              </nav>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
