export const dynamic = 'force-dynamic';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { getTopicTree } from '@/lib/taxonomy';
import type { TopicNode } from '@/lib/types';

const byCount = (a: TopicNode, b: TopicNode) => b.totalCount - a.totalCount || a.name.localeCompare(b.name, 'he');

export default async function TopicsPage() {
  const tree = await getTopicTree();
  const roots = [...tree.values()].filter((t) => t.parentIds.length === 0 && t.totalCount > 0);
  // Main branches have sub-topics; the rest are stand-alone topics.
  const branches = roots.filter((t) => t.childIds.length > 0).sort(byCount);
  const standalone = roots.filter((t) => t.childIds.length === 0).sort(byCount);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20 py-8">
      <div className="container mx-auto px-4">
        <h1 className="text-4xl font-bold mb-2">נושאים</h1>
        <p className="text-muted-foreground mb-8">עיון בכל התכנים לפי נושא</p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {branches.map((topic) => {
            const children = topic.childIds
              .map((id) => tree.get(id))
              .filter((c): c is TopicNode => !!c && c.totalCount > 0)
              .sort(byCount);
            return (
              <div key={topic.id} className="bg-white rounded-lg shadow-md p-6 flex flex-col">
                <Link href={`/topics/${topic.id}`} className="group flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-bold group-hover:text-primary transition-colors">{topic.name}</h2>
                  <span className="text-sm text-muted-foreground">{topic.totalCount}</span>
                </Link>
                <div className="flex flex-wrap gap-2 mb-4">
                  {children.slice(0, 8).map((c) => (
                    <Link
                      key={c.id}
                      href={`/topics/${c.id}?from=${topic.id}`}
                      className="px-3 py-1 bg-secondary rounded-full text-sm hover:bg-primary/10 hover:text-primary transition-colors"
                    >
                      {c.name}
                    </Link>
                  ))}
                </div>
                <Link
                  href={`/topics/${topic.id}`}
                  className="mt-auto inline-flex items-center gap-1 text-primary font-semibold text-sm"
                >
                  <span>{children.length > 8 ? `כל ${children.length} תתי-הנושאים` : 'לנושא'}</span>
                  <ArrowLeft className="w-4 h-4" />
                </Link>
              </div>
            );
          })}
        </div>

        {standalone.length > 0 && (
          <section className="mt-12">
            <h2 className="text-2xl font-bold mb-4">נושאים נוספים</h2>
            <div className="flex flex-wrap gap-2">
              {standalone.map((t) => (
                <Link
                  key={t.id}
                  href={`/topics/${t.id}`}
                  className="px-3 py-1 bg-white border rounded-full text-sm hover:border-primary hover:text-primary transition-colors"
                >
                  {t.name} <span className="text-muted-foreground">({t.totalCount})</span>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
