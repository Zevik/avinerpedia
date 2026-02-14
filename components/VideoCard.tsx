import Link from 'next/link';
import Image from 'next/image';
import { Play } from 'lucide-react';
import type { ContentItem } from '@/lib/types';

interface VideoCardProps {
  item: ContentItem;
  className?: string;
}

export function VideoCard({ item, className = '' }: VideoCardProps) {
  const videoId = item.video_id;

  // Determine if it's a YouTube video, Machon Meir, or Maale
  const isYouTube = videoId && !videoId.includes('Maale:') && !videoId.includes('Meir:');
  const isMeir = videoId && videoId.includes('Meir:');
  const isMaale = videoId && videoId.includes('Maale:');

  const thumbnailUrl = isYouTube
    ? `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`
    : null;

  return (
    <Link
      href={`/content/${item.id}`}
      className={`video-card block group ${className}`}
    >
      <div className="relative overflow-hidden rounded-lg bg-muted aspect-video">
        {thumbnailUrl ? (
          <Image
            src={thumbnailUrl}
            alt={item.title}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        ) : (
          <div className={`w-full h-full flex flex-col items-center justify-center ${isMeir ? 'bg-orange-50' : isMaale ? 'bg-blue-50' : 'bg-gradient-to-br from-primary/10 to-primary/5'
            }`}>
            <Play className={`w-12 h-12 ${isMeir ? 'text-orange-400' : isMaale ? 'text-blue-400' : 'text-primary/50'}`} />
            {isMeir && <span className="text-[10px] font-bold text-orange-600 mt-2 uppercase tracking-wider">Machon Meir</span>}
            {isMaale && <span className="text-[10px] font-bold text-blue-600 mt-2 uppercase tracking-wider">Maale</span>}
          </div>
        )}

        {/* Play button overlay */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <div className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center">
            <Play className="w-8 h-8 text-primary mr-1" fill="currentColor" />
          </div>
        </div>
      </div>

      {/* Title */}
      <h3 className="mt-3 font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-2">
        {item.title}
      </h3>

      {/* Sub-category tag */}
      {item.sub_category && (
        <span className="inline-block mt-2 text-xs px-2 py-1 bg-secondary text-secondary-foreground rounded-full">
          {item.sub_category}
        </span>
      )}
    </Link>
  );
}
