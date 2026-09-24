import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { getContentCount, getContentItems } from '@/lib/db';
import { findNodePath, getFilterTree, getSaSectionCounts, resolveTopicParam, type FilterScope } from '@/lib/filters';
import type { ContentFilters } from '@/lib/types';
import { InfiniteContentList } from './InfiniteContentList';
import { TopicFilter } from './TopicFilter';

interface FilteredContentPageProps {
  title: string;
  basePath: string;
  scope: FilterScope;
  baseFilters: ContentFilters;
  type: 'article' | 'qa' | 'video';
  searchParams: { topic?: string; sa?: string };
  /** Show the Shulchan Aruch section chips (Q&A). */
  withSaSections?: boolean;
}

/** /videos, /articles and /qa: curated topic filter + (for Q&A) Shulchan Aruch sections + list. */
export async function FilteredContentPage({
  title, basePath, scope, baseFilters, type, searchParams, withSaSections,
}: FilteredContentPageProps) {
  const tree = await getFilterTree(scope);
  const node = resolveTopicParam(tree, searchParams.topic);
  const sa = withSaSections ? searchParams.sa : undefined;

  const filters: ContentFilters = {
    ...baseFilters,
    ...(node ? { node_id: node.id } : {}),
    ...(sa ? { sa_section: sa } : {}),
    limit: 50,
  };
  const [items, total, saCounts] = await Promise.all([
    getContentItems(filters),
    getContentCount({ ...baseFilters }),
    withSaSections ? getSaSectionCounts() : Promise.resolve([]),
  ]);
  const path = node ? findNodePath(tree, node.id) : [];

  const saHref = (section?: string) => {
    const params = new URLSearchParams();
    if (node) params.set('topic', String(node.id));
    if (section) params.set('sa', section);
    const qs = params.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20 py-8">
      <div className="container mx-auto px-4">
        <h1 className="text-4xl font-bold mb-8">{title}</h1>

        <div className="flex flex-col lg:flex-row gap-8">
          {tree.length > 0 && (
            <div className="lg:w-72 flex-shrink-0">
              <TopicFilter tree={tree} currentId={node?.id} basePath={basePath} keep={{ sa }} totalCount={total} />
            </div>
          )}

          <div className="flex-1 min-w-0">
            {withSaSections && saCounts.length > 0 && (
              <nav aria-label="חלקי השולחן ערוך" className="flex flex-wrap gap-2 mb-6">
                <Link href={saHref()} className={`px-4 py-1.5 rounded-full text-sm font-medium ${!sa ? 'bg-primary text-primary-foreground' : 'bg-white shadow-sm hover:bg-secondary'}`}>
                  כל חלקי השו"ע
                </Link>
                {saCounts.map(({ section, count }) => (
                  <Link key={section} href={saHref(section)} className={`px-4 py-1.5 rounded-full text-sm font-medium ${sa === section ? 'bg-primary text-primary-foreground' : 'bg-white shadow-sm hover:bg-secondary'}`}>
                    {section} <span className="opacity-70">({count})</span>
                  </Link>
                ))}
              </nav>
            )}

            {path.length > 0 && (
              <div className="mb-6">
                <nav aria-label="נושא נבחר" className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground mb-1">
                  {path.slice(0, -1).map((p) => (
                    <span key={p.id} className="flex items-center gap-1">
                      <Link href={`${basePath}?topic=${p.id}`} className="hover:text-primary">{p.name}</Link>
                      <ChevronLeft className="w-4 h-4" />
                    </span>
                  ))}
                </nav>
                <h2 className="text-2xl font-semibold">
                  {node!.name} <span className="text-base font-normal text-muted-foreground">({node!.count})</span>
                </h2>
              </div>
            )}

            {/* key: the list keeps its items in state, so remount it when the filter changes. */}
            <InfiniteContentList key={`${node?.id ?? 'all'}-${sa ?? ''}`} initialItems={items} filters={filters} type={type} />
          </div>
        </div>
      </div>
    </div>
  );
}
