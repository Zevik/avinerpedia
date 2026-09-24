import Link from 'next/link';
import { Tag } from 'lucide-react';

interface TopicChipsProps {
  topics: { id: number; name: string; is_primary: boolean }[];
}

/** Links to the topic pages an item is tagged with. */
export function TopicChips({ topics }: TopicChipsProps) {
  if (topics.length === 0) return null;

  return (
    <div className="container mx-auto px-4 max-w-4xl mt-6">
      <div className="bg-white rounded-lg shadow-md p-4 flex flex-wrap items-center gap-2">
        <Tag className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground ml-1">נושאים:</span>
        {topics.map((t) => (
          <Link
            key={t.id}
            href={`/topics/${t.id}`}
            className={`px-3 py-1 rounded-full text-sm transition-colors ${
              t.is_primary
                ? 'bg-primary text-white hover:bg-primary/90'
                : 'bg-secondary hover:bg-primary/10 hover:text-primary'
            }`}
          >
            {t.name}
          </Link>
        ))}
      </div>
    </div>
  );
}
