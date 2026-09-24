import Link from 'next/link';
import { displayTitle } from '@/lib/utils';
import { ArrowLeft, ArrowRight, BookOpen } from 'lucide-react';

interface Episode {
  id: number;
  title: string;
}

interface SeriesNavProps {
  series: { id: number; name: string; episode_count: number };
  order: number;
  prev: Episode | null;
  next: Episode | null;
}

/** "Episode N of M" bar with links to the series and to the previous / next episode. */
export function SeriesNav({ series, order, prev, next }: SeriesNavProps) {
  return (
    <nav aria-label="ניווט בסדרה" className="container mx-auto px-4 max-w-4xl mb-6">
      <div className="bg-white rounded-lg shadow-md p-4">
        <Link
          href={`/series/${series.id}`}
          className="flex items-center gap-2 font-semibold text-primary hover:underline"
        >
          <BookOpen className="w-5 h-5 flex-shrink-0" />
          <span>{series.name}</span>
          <span className="text-sm font-normal text-muted-foreground">
            · שיעור {order} מתוך {series.episode_count}
          </span>
        </Link>

        {(prev || next) && (
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {prev ? (
              <Link
                href={`/content/${prev.id}`}
                className="flex items-center gap-2 p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors text-sm"
              >
                <ArrowRight className="w-4 h-4 flex-shrink-0" />
                <span className="line-clamp-1">
                  <span className="text-muted-foreground">הקודם: </span>
                  {displayTitle(prev.title)}
                </span>
              </Link>
            ) : (
              <span className="hidden sm:block" />
            )}
            {next && (
              <Link
                href={`/content/${next.id}`}
                className="flex items-center justify-end gap-2 p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors text-sm text-left"
              >
                <span className="line-clamp-1">
                  <span className="text-muted-foreground">הבא: </span>
                  {displayTitle(next.title)}
                </span>
                <ArrowLeft className="w-4 h-4 flex-shrink-0" />
              </Link>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
