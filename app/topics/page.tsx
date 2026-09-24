// Cached for a day (lib/cache.ts); admin saves purge it via /api/revalidate.
export const revalidate = 86400;
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { getFilterTree, nodeHref } from '@/lib/filters';
import { pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata({
  title: 'נושאים - שיעורים ומאמרים לפי נושא | הרב שלמה אבינר',
  description: 'כל התכנים של הרב שלמה אבינר מסודרים לפי נושאים: הלכה, אמונה, תורה, מדינת ישראל וצה"ל, חינוך, זוגיות ומשפחה, מועדים ועוד.',
  path: '/topics',
});

export default async function TopicsPage() {
  const tree = await getFilterTree('all');

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20 py-8">
      <div className="container mx-auto px-4">
        <h1 className="text-4xl font-bold mb-2">נושאים</h1>
        <p className="text-muted-foreground mb-8">עיון בכל התכנים לפי נושא</p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tree.map((core) => (
            <section key={core.id} className="bg-white rounded-lg shadow-md p-6 flex flex-col">
              <Link href={nodeHref(core.path)} className="group flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold group-hover:text-primary transition-colors">{core.name}</h2>
                <span className="text-sm text-muted-foreground">{core.count}</span>
              </Link>
              <div className="flex flex-wrap gap-2 mb-4">
                {core.children.slice(0, 8).map((sub) => (
                  <Link
                    key={sub.id}
                    href={nodeHref(sub.path)}
                    className="px-3 py-1 bg-secondary rounded-full text-sm hover:bg-primary/10 hover:text-primary transition-colors"
                  >
                    {sub.name}
                  </Link>
                ))}
              </div>
              <Link href={nodeHref(core.path)} className="mt-auto inline-flex items-center gap-1 text-primary font-semibold text-sm">
                <span>{core.children.length > 8 ? `כל ${core.children.length} תתי-הנושאים` : 'לנושא'}</span>
                <ArrowLeft className="w-4 h-4" />
              </Link>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
