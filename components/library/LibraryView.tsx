import Link from 'next/link';
import { Search, X } from 'lucide-react';
import { findNodePath, getFilterTree, resolveTopicParam, SA_SECTIONS } from '@/lib/filters';
import {
  getLibraryFacets, getLibraryItems, getSources, libraryHref, LIBRARY_PAGE_SIZE, MEDIA_TYPES, parseLibraryState,
  treeWithCounts, withChange, type LibraryState, type MediaType,
} from '@/lib/library';
import { LibraryCard } from './LibraryCard';
import { LibraryFilters } from './LibraryFilters';

interface LibraryViewProps {
  heading: string;
  searchParams: Record<string, string | string[] | undefined>;
  /** The preset's type on /videos, /articles, /qa. */
  fixedType?: MediaType;
}

/**
 * The content library: search, three filter axes, mixed results with type labels, paging.
 * Its links (here, LibraryFilters, LibraryCard) use prefetch={false}: a page has ~70 of them
 * (filters, results), and prefetching them all clogged the server so clicks stalled.
 */
export async function LibraryView({ heading, searchParams, fixedType }: LibraryViewProps) {
  const parsed = parseLibraryState(searchParams, fixedType);
  const [sources, tree] = await Promise.all([getSources(), getFilterTree('all')]);
  const source = sources.find((s) => s.slug === parsed.source);
  const node = resolveTopicParam(tree, parsed.topicParam);
  const state: LibraryState = { q: parsed.q, type: parsed.type, topic: node?.id, source: source?.slug, sa: parsed.sa, page: parsed.page };

  const [{ items, total }, facets] = await Promise.all([getLibraryItems(state, source?.id), getLibraryFacets(state, source?.id)]);
  const topicPath = node ? findNodePath(tree, node.id) : [];
  const sourceName = new Map(sources.map((s) => [s.id, s.name]));
  const pages = Math.ceil(total / LIBRARY_PAGE_SIZE);

  // Active filters as removable chips.
  const typeLabel = MEDIA_TYPES.find((t) => t.key === state.type)?.label;
  const chips = [
    typeLabel && { label: typeLabel, href: libraryHref(withChange(state, { type: undefined })) },
    state.sa && { label: state.sa, href: libraryHref(withChange(state, { sa: undefined })) },
    source && { label: source.name, href: libraryHref(withChange(state, { source: undefined })) },
    node && { label: topicPath.map((n) => n.name).join(' › '), href: libraryHref(withChange(state, { topic: undefined })) },
    state.q && { label: `"${state.q}"`, href: libraryHref(withChange(state, { q: undefined })) },
  ].filter(Boolean) as { label: string; href: string }[];

  // The search form submits to the current page and keeps the other filters.
  const formAction = libraryHref({ type: state.type }).split('?')[0];
  const hidden = { type: state.type === 'series' ? 'series' : undefined, topic: state.topic ? String(state.topic) : undefined, source: state.source, sa: state.sa };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20 py-8">
      <div className="container mx-auto px-4">
        <h1 className="text-3xl md:text-4xl font-bold mb-2">{heading}</h1>
        <p className="text-muted-foreground mb-6">
          {total.toLocaleString('he-IL')} תכנים{state.q || chips.length ? ' מתאימים' : ''}
        </p>

        <form action={formAction} method="get" role="search" className="relative mb-4 max-w-2xl">
          <label htmlFor="library-q" className="sr-only">חיפוש בספרייה</label>
          <Search className="w-5 h-5 absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            id="library-q"
            name="q"
            type="search"
            defaultValue={state.q}
            placeholder="חיפוש שיעורים, מאמרים ושאלות..."
            className="w-full bg-white border rounded-xl pr-12 pl-24 py-3 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
          {Object.entries(hidden).map(([k, v]) => v && <input key={k} type="hidden" name={k} value={v} />)}
          <button type="submit" className="absolute left-2 top-1/2 -translate-y-1/2 px-4 py-1.5 rounded-lg bg-primary text-primary-foreground font-medium">
            חיפוש
          </button>
        </form>

        {chips.length > 0 && (
          <div className="flex gap-2 mb-6 overflow-x-auto pb-1 -mx-4 px-4 lg:mx-0 lg:px-0 lg:flex-wrap" aria-label="סינונים פעילים">
            {chips.map((c) => (
              <Link prefetch={false} key={c.label} href={c.href} scroll={false} className="flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium hover:bg-primary/20">
                {c.label}
                <X className="w-3.5 h-3.5" aria-label="הסרה" />
              </Link>
            ))}
            {chips.length > 1 && (
              <Link prefetch={false} href="/library" className="flex-shrink-0 px-3 py-1.5 text-sm text-muted-foreground hover:text-primary underline-offset-2 hover:underline">
                ניקוי הכל
              </Link>
            )}
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
          <LibraryFilters
            state={state}
            typeCounts={facets.types}
            sources={sources.map((s) => ({ slug: s.slug, name: s.name, count: facets.sources.get(s.id) ?? 0 })).filter((s) => s.count > 0 || s.slug === state.source)}
            saSections={state.type === 'qa' ? SA_SECTIONS.map((name) => ({ name, count: facets.sa.get(name) ?? 0 })).filter((s) => s.count > 0 || s.name === state.sa) : []}
            topicTree={treeWithCounts(tree, facets.nodes)}
            topicPathIds={topicPath.map((n) => n.id)}
            total={total}
            activeCount={[state.type && !fixedType, state.sa, state.source, state.topic].filter(Boolean).length}
          />

          <section aria-label="תוצאות" className="flex-1 min-w-0">
            {items.length > 0 ? (
              <ul className="space-y-3">
                {items.map((item) => (
                  <li key={item.id}>
                    <LibraryCard item={item} sourceName={item.source_id ? sourceName.get(item.source_id) : undefined} />
                  </li>
                ))}
              </ul>
            ) : (
              <div className="bg-white rounded-xl shadow-sm p-10 text-center">
                <p className="text-lg font-medium mb-2">לא נמצאו תכנים</p>
                <p className="text-muted-foreground mb-4">נסו מילות חיפוש אחרות או הסירו חלק מהסינונים.</p>
                <Link prefetch={false} href="/library" className="text-primary font-medium hover:underline">לכל התכנים</Link>
              </div>
            )}

            {pages > 1 && (
              <nav aria-label="עמודים" className="flex items-center justify-center gap-4 mt-8">
                {state.page > 1 && (
                  <Link prefetch={false} href={libraryHref({ ...state, page: state.page - 1 })} className="px-4 py-2 rounded-full border-2 border-primary text-primary hover:bg-primary hover:text-white transition-colors">
                    הקודם
                  </Link>
                )}
                <span className="text-muted-foreground">עמוד {state.page} מתוך {pages}</span>
                {state.page < pages && (
                  <Link prefetch={false} href={libraryHref({ ...state, page: state.page + 1 })} className="px-4 py-2 rounded-full border-2 border-primary text-primary hover:bg-primary hover:text-white transition-colors">
                    הבא
                  </Link>
                )}
              </nav>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
