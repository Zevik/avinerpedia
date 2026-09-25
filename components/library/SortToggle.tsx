import Link from 'next/link';
import type { LibrarySort } from '@/lib/library-url';

/**
 * The default order ("מומלץ היום": the daily shuffle; for series: episode order) or "הכי חדש".
 * A search is always sorted by relevance, so there is nothing to choose then.
 */
export function SortToggle({ sort, defaultLabel, defaultHref, newestHref }: {
  sort: LibrarySort;
  defaultLabel: string;
  defaultHref: string;
  newestHref: string;
}) {
  if (sort === 'relevance') return <p className="text-sm text-muted-foreground">ממוין לפי רלוונטיות</p>;
  const pill = (active: boolean) =>
    `px-3 py-1 rounded-full text-sm font-medium transition-colors ${active ? 'bg-primary text-primary-foreground' : 'bg-white border hover:bg-secondary'}`;
  const newest = sort === 'newest';
  return (
    <nav aria-label="מיון" className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground">מיון:</span>
      <Link prefetch={false} scroll={false} href={defaultHref} className={pill(!newest)} aria-current={!newest ? 'true' : undefined}>
        {defaultLabel}
      </Link>
      <Link prefetch={false} scroll={false} href={newestHref} className={pill(newest)} aria-current={newest ? 'true' : undefined}>
        הכי חדש
      </Link>
    </nav>
  );
}
