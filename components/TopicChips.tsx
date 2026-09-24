import Link from 'next/link';
import { Hash, Tag } from 'lucide-react';
import { nodeHref } from '@/lib/filters';

interface TopicChipsProps {
  /** Curated topics (most specific nodes), primary first. */
  topics: { path: string; name: string; primary: boolean }[];
  /** Specific-question tags (content_items.original_tags); they link to search. */
  tags?: string[];
}

/** Topic links at the bottom of a content page, plus the item's tags. */
export function TopicChips({ topics, tags = [] }: TopicChipsProps) {
  if (topics.length === 0 && tags.length === 0) return null;

  return (
    <div className="container mx-auto px-4 max-w-4xl mt-6">
      <div className="bg-white rounded-lg shadow-md p-4 space-y-3">
        {topics.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <Tag className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground ml-1">נושאים:</span>
            {topics.map((t) => (
              <Link
                key={t.path}
                href={nodeHref(t.path)}
                title={t.path}
                className={`px-3 py-1 rounded-full text-sm transition-colors ${
                  t.primary ? 'bg-primary text-white hover:bg-primary/90' : 'bg-secondary hover:bg-primary/10 hover:text-primary'
                }`}
              >
                {t.name}
              </Link>
            ))}
          </div>
        )}
        {tags.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <Hash className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground ml-1">תגיות:</span>
            {tags.map((tag) => (
              <Link
                key={tag}
                href={`/search?q=${encodeURIComponent(tag)}`}
                className="px-2.5 py-0.5 rounded-full text-xs border text-muted-foreground hover:border-primary hover:text-primary transition-colors"
              >
                {tag}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
