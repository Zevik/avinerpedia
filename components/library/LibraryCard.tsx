import Link from 'next/link';
import Image from 'next/image';
import { Play } from 'lucide-react';
import { kindOf } from './kind';
import type { ContentItem } from '@/lib/types';
import { cardSummary, displayTitle } from '@/lib/utils';
import { cardThumbnail } from '@/lib/video';

/** What a card needs: a library result, or a plain content item (topic pages). */
type CardItem = Pick<ContentItem, 'id' | 'title' | 'summary' | 'video_id' | 'sub_category'> & { media_types?: string[] | null };

export function LibraryCard({ item, sourceName }: { item: CardItem; sourceName?: string }) {
  const kind = kindOf(item.media_types || []);
  const thumbnail = cardThumbnail(item.video_id);
  const summary = cardSummary(item.summary);
  const title = displayTitle(item.title);

  return (
    <Link prefetch={false}
      href={`/content/${item.id}`}
      className="group flex gap-4 bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow p-4"
    >
      {thumbnail && (
        <div className="relative w-28 sm:w-44 flex-shrink-0 self-start aspect-video overflow-hidden rounded-lg bg-muted">
          <Image src={thumbnail} alt="" fill className="object-cover" sizes="(max-width: 640px) 112px, 176px" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-9 h-9 rounded-full bg-white/90 flex items-center justify-center shadow">
              <Play className="w-4 h-4 text-primary mr-0.5" fill="currentColor" />
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2 mb-1.5 text-xs font-medium">
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full ${kind.cls}`}>
            <kind.Icon className="w-3.5 h-3.5" aria-hidden />
            {kind.label}
          </span>
          {sourceName && <span className="px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">{sourceName}</span>}
        </div>
        <h2 className="text-lg font-bold leading-snug group-hover:text-primary transition-colors line-clamp-2">{title}</h2>
        {summary && <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{summary}</p>}
        {item.sub_category && item.sub_category !== sourceName && (
          <span className="inline-block mt-2 text-xs text-muted-foreground">{item.sub_category}</span>
        )}
      </div>
    </Link>
  );
}
