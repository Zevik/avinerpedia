import Link from 'next/link';
import { BookOpen, ArrowLeft } from 'lucide-react';

interface SeriesCardProps {
  id: number;
  name: string;
  episodeCount: number;
  className?: string;
}

export function SeriesCard({ id, name, episodeCount, className = '' }: SeriesCardProps) {
  return (
    <Link
      href={`/series/${id}`}
      className={`group block p-6 bg-white border rounded-lg shadow-sm hover:shadow-lg transition-shadow ${className}`}
    >
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
          <BookOpen className="w-6 h-6 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-foreground mb-1 line-clamp-2 group-hover:text-primary transition-colors">
            {name}
          </h3>
          <p className="text-sm text-muted-foreground">{episodeCount} שיעורים</p>
        </div>
        <ArrowLeft className="w-5 h-5 text-primary flex-shrink-0 mt-1" />
      </div>
    </Link>
  );
}
