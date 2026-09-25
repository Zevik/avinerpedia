import Link from 'next/link';
import Image from 'next/image';
import { BookOpen, Play } from 'lucide-react';
import { kindOf } from '@/components/library/kind';
import type { LibraryItem } from '@/lib/library';
import { displayTitle } from '@/lib/utils';
import { cardThumbnail } from '@/lib/video';

/** Compact cards for the home page rows (ContentRow): fixed width, snap into place. */

const CARD = 'group snap-start flex-shrink-0 w-[70%] sm:w-60 md:w-64 bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col';

export function ItemRowCard({ item, sourceName }: { item: LibraryItem; sourceName?: string }) {
  const kind = kindOf(item.media_types || []);
  const thumbnail = cardThumbnail(item.video_id);
  const title = displayTitle(item.title);
  const meta = sourceName || item.sub_category;

  return (
    <Link prefetch={false} href={`/content/${item.id}`} className={CARD}>
      {thumbnail ? (
        <div className="relative aspect-video bg-muted">
          <Image src={thumbnail} alt={title} fill className="object-cover" sizes="(max-width: 640px) 70vw, 256px" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center shadow">
              <Play className="w-5 h-5 text-primary mr-0.5" fill="currentColor" />
            </div>
          </div>
        </div>
      ) : (
        <div className={`h-1.5 ${kind.strip}`} />
      )}
      <div className="p-3 flex flex-col flex-1">
        <span className={`self-start inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium mb-1.5 ${kind.cls}`}>
          <kind.Icon className="w-3.5 h-3.5" aria-hidden />
          {kind.label}
        </span>
        <h3 className="font-bold leading-snug line-clamp-2 group-hover:text-primary transition-colors">{title}</h3>
        {meta && <p className="mt-auto pt-2 text-xs text-muted-foreground line-clamp-1">{meta}</p>}
      </div>
    </Link>
  );
}

export function SeriesRowCard({ id, name, episodes }: { id: number; name: string; episodes: number }) {
  return (
    <Link prefetch={false} href={`/series/${id}`} className={CARD}>
      <div className="aspect-[16/7] bg-gradient-to-br from-blue-800 to-indigo-900 flex items-center justify-center">
        <BookOpen className="w-10 h-10 text-blue-100" aria-hidden />
      </div>
      <div className="p-3">
        <h3 className="font-bold leading-snug line-clamp-2 group-hover:text-primary transition-colors">{name}</h3>
        <p className="text-xs text-muted-foreground mt-1">{episodes} שיעורים</p>
      </div>
    </Link>
  );
}
