'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { ChevronDown, ChevronLeft, Filter, Search, X } from 'lucide-react';
import type { FilterNode } from '@/lib/types';

interface TopicFilterProps {
  tree: FilterNode[];
  currentId?: number | null;
  basePath: string;
  /** Other query params to keep when the topic changes (e.g. the Q&A section). */
  keep?: Record<string, string | undefined>;
  totalCount?: number;
}

/**
 * Curated topic filter: core topics with counts, expandable to sub-topics (and a third
 * level such as "הלכות חנוכה" or chumash › parasha). Desktop sidebar; drawer on mobile.
 */
export function TopicFilter({ tree, currentId, basePath, keep = {}, totalCount }: TopicFilterProps) {
  const [open, setOpen] = useState(false);

  const current = useMemo(() => (currentId ? findPath(tree, currentId) : []), [tree, currentId]);
  const href = (id: number | null) => {
    const params = new URLSearchParams();
    if (id) params.set('topic', String(id));
    for (const [k, v] of Object.entries(keep)) if (v) params.set(k, v);
    const qs = params.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  };

  const panel = <FilterPanel tree={tree} current={current} href={href} totalCount={totalCount} onNavigate={() => setOpen(false)} />;

  return (
    <>
      <aside aria-label="סינון לפי נושא" className="hidden lg:block bg-white rounded-lg shadow-lg p-5 sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto">
        {panel}
      </aside>

      {/* Mobile: a button that opens the same panel in a drawer */}
      <div className="lg:hidden mb-6">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="w-full flex items-center justify-between gap-2 bg-white rounded-lg shadow px-4 py-3 font-medium"
        >
          <span className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-primary" />
            {current.length ? current.map((n) => n.name).join(' › ') : 'סינון לפי נושא'}
          </span>
          <ChevronDown className="w-5 h-5 text-muted-foreground" />
        </button>
        {open && (
          <div className="fixed inset-0 z-50 flex" role="dialog" aria-modal="true" aria-label="סינון לפי נושא">
            <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
            <div className="relative mr-auto w-[85%] max-w-sm h-full bg-white shadow-xl p-5 overflow-y-auto">
              <button type="button" onClick={() => setOpen(false)} className="absolute left-4 top-4 p-1 rounded-full hover:bg-secondary" aria-label="סגור">
                <X className="w-5 h-5" />
              </button>
              {panel}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

function FilterPanel({
  tree, current, href, totalCount, onNavigate,
}: {
  tree: FilterNode[];
  current: FilterNode[];
  href: (id: number | null) => string;
  totalCount?: number;
  onNavigate: () => void;
}) {
  const [query, setQuery] = useState('');
  const matches = useMemo(() => (query.trim().length >= 2 ? searchTree(tree, query.trim()) : null), [tree, query]);
  const currentId = current.at(-1)?.id ?? null;

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <Filter className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-bold">סינון לפי נושא</h2>
      </div>

      <label className="relative block mb-4">
        <span className="sr-only">חיפוש נושא</span>
        <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="חיפוש נושא..."
          className="w-full border rounded-lg pr-9 pl-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
      </label>

      <Link
        href={href(null)}
        onClick={onNavigate}
        className={`flex items-center justify-between px-3 py-2 rounded-lg font-medium mb-1 ${!currentId ? 'bg-primary text-primary-foreground' : 'hover:bg-secondary'}`}
      >
        <span>הכל</span>
        {totalCount !== undefined && <span className="text-xs opacity-80">{totalCount}</span>}
      </Link>

      {matches ? (
        <ul className="space-y-1">
          {matches.length === 0 && <li className="text-sm text-muted-foreground px-3 py-2">לא נמצאו נושאים</li>}
          {matches.map(({ node, path }) => (
            <li key={node.id}>
              <Link href={href(node.id)} onClick={onNavigate} className={`block px-3 py-2 rounded-lg hover:bg-secondary ${node.id === currentId ? 'bg-primary/10 text-primary font-semibold' : ''}`}>
                <span className="flex items-center justify-between gap-2">
                  <span>{node.name}</span>
                  <span className="text-xs text-muted-foreground">{node.count}</span>
                </span>
                {path.length > 1 && <span className="block text-xs text-muted-foreground">{path.slice(0, -1).map((p) => p.name).join(' › ')}</span>}
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <ul className="space-y-0.5">
          {tree.map((node) => (
            <TreeItem key={node.id} node={node} currentPathIds={current.map((n) => n.id)} href={href} onNavigate={onNavigate} />
          ))}
        </ul>
      )}
    </div>
  );
}

function TreeItem({
  node, currentPathIds, href, onNavigate,
}: {
  node: FilterNode;
  currentPathIds: number[];
  href: (id: number | null) => string;
  onNavigate: () => void;
}) {
  const inPath = currentPathIds.includes(node.id);
  const isCurrent = currentPathIds.at(-1) === node.id;
  const [expanded, setExpanded] = useState(inPath);
  const hasChildren = node.children.length > 0;

  return (
    <li>
      <div className={`flex items-center rounded-lg ${isCurrent ? 'bg-primary text-primary-foreground' : inPath ? 'bg-primary/10' : 'hover:bg-secondary'}`}>
        {hasChildren ? (
          <button
            type="button"
            onClick={() => setExpanded((e) => !e)}
            className="p-2 shrink-0"
            aria-label={expanded ? `כווץ ${node.name}` : `הרחב ${node.name}`}
            aria-expanded={expanded}
          >
            {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        ) : (
          <span className="w-8 shrink-0" />
        )}
        <Link
          href={href(node.id)}
          onClick={onNavigate}
          className={`flex-1 flex items-center justify-between gap-2 py-2 pl-3 ${node.depth === 0 ? 'font-semibold' : 'text-sm'}`}
        >
          <span>{node.name}</span>
          <span className={`text-xs ${isCurrent ? 'opacity-80' : 'text-muted-foreground'}`}>{node.count}</span>
        </Link>
      </div>
      {hasChildren && expanded && (
        <ul className="mr-4 border-r pr-1 space-y-0.5">
          {node.children.map((child) => (
            <TreeItem key={child.id} node={child} currentPathIds={currentPathIds} href={href} onNavigate={onNavigate} />
          ))}
        </ul>
      )}
    </li>
  );
}

function findPath(tree: FilterNode[], id: number): FilterNode[] {
  for (const node of tree) {
    if (node.id === id) return [node];
    const below = findPath(node.children, id);
    if (below.length) return [node, ...below];
  }
  return [];
}

function searchTree(tree: FilterNode[], q: string) {
  const out: { node: FilterNode; path: FilterNode[] }[] = [];
  const walk = (nodes: FilterNode[], path: FilterNode[]) => {
    for (const n of nodes) {
      const p = [...path, n];
      if (n.name.includes(q)) out.push({ node: n, path: p });
      walk(n.children, p);
    }
  };
  walk(tree, []);
  return out.sort((a, b) => b.node.count - a.node.count).slice(0, 30);
}
