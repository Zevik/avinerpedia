import { notFound } from 'next/navigation';
export const dynamic = 'force-dynamic';
import type { Metadata } from 'next';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { ArticleCard } from '@/components/ArticleCard';
import { getContentItems } from '@/lib/db';
import { findNodeBySegments, getFilterTree, nodeHref } from '@/lib/filters';
import { pageMetadata } from '@/lib/seo';

const PAGE_SIZE = 30;

interface TopicPageProps {
  params: Promise<{ path: string[] }>;
  searchParams: Promise<{ page?: string }>;
}

const decode = (s: string) => {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
};

/** /topics/מועדים/חנוכה -> the node and its ancestors (empty if no such node). */
async function resolve(params: TopicPageProps['params']) {
  const { path } = await params;
  const segments = path.map(decode);
  // Known old numeric topic URLs (/topics/123) are 301-redirected in next.config.ts.
  const tree = await getFilterTree('all');
  return findNodeBySegments(tree, segments);
}

export async function generateMetadata({ params }: Pick<TopicPageProps, 'params'>): Promise<Metadata> {
  const chain = await resolve(params);
  const node = chain.at(-1);
  if (!node) return { title: 'הדף לא נמצא | אבינרפדיה', robots: { index: false } };
  return pageMetadata({
    title: `${node.name} - שיעורים ומאמרים | הרב שלמה אבינר`,
    description: `${node.count} שיעורים, מאמרים ושאלות ותשובות בנושא ${chain.map((n) => n.name).join(' › ')} מאת הרב שלמה אבינר.`,
    path: nodeHref(node.path),
  });
}

export default async function TopicPage({ params, searchParams }: TopicPageProps) {
  const chain = await resolve(params);
  const node = chain.at(-1);
  if (!node) notFound();

  const page = Math.max(1, Number((await searchParams).page) || 1);
  const items = await getContentItems({ node_id: node.id, limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE });
  const pages = Math.ceil(node.count / PAGE_SIZE);
  const pageHref = (p: number) => `${nodeHref(node.path)}${p > 1 ? `?page=${p}` : ''}`;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20 py-8">
      <div className="container mx-auto px-4 max-w-5xl">
        <nav aria-label="פירורי לחם" className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground mb-4">
          <Link href="/topics" className="hover:text-primary">נושאים</Link>
          {chain.slice(0, -1).map((p) => (
            <span key={p.id} className="flex items-center gap-1">
              <ChevronLeft className="w-4 h-4" />
              <Link href={nodeHref(p.path)} className="hover:text-primary">{p.name}</Link>
            </span>
          ))}
        </nav>

        <h1 className="text-4xl font-bold mb-2">{node.name}</h1>
        <p className="text-muted-foreground mb-8">{node.count} פריטים</p>

        {node.children.length > 0 && (
          <section className="mb-10">
            <h2 className="text-xl font-bold mb-4">תתי-נושאים</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {node.children.map((c) => (
                <Link
                  key={c.id}
                  href={nodeHref(c.path)}
                  className="flex items-center justify-between gap-2 bg-white rounded-lg shadow-sm hover:shadow-md p-3 transition-shadow"
                >
                  <span className="font-medium line-clamp-2">{c.name}</span>
                  <span className="text-sm text-muted-foreground flex-shrink-0">{c.count}</span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {items.length > 0 && (
          <section>
            {node.children.length > 0 && <h2 className="text-xl font-bold mb-4">כל התכנים בנושא {node.name}</h2>}
            <div className="space-y-6">
              {items.map((item) => (
                <ArticleCard key={item.id} article={item} />
              ))}
            </div>

            {pages > 1 && (
              <nav aria-label="עמודים" className="flex items-center justify-center gap-4 mt-10">
                {page > 1 && (
                  <Link href={pageHref(page - 1)} className="px-4 py-2 rounded-full border-2 border-primary text-primary hover:bg-primary hover:text-white transition-colors">
                    הקודם
                  </Link>
                )}
                <span className="text-muted-foreground">עמוד {page} מתוך {pages}</span>
                {page < pages && (
                  <Link href={pageHref(page + 1)} className="px-4 py-2 rounded-full border-2 border-primary text-primary hover:bg-primary hover:text-white transition-colors">
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
