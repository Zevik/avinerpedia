'use client';

import Link from 'next/link';
import { useCallback, useMemo, useRef, useState } from 'react';
import { ChevronDown, ChevronLeft, Search, SlidersHorizontal, X } from 'lucide-react';
import { libraryHref, MEDIA_TYPES, withChange, type LibraryState, type MediaType } from '@/lib/library-url';
import type { FilterNode } from '@/lib/types';
import { useDialogFocus } from '@/lib/hooks/useDialogFocus';

export interface LibraryFilterData {
  state: LibraryState;
  typeCounts: Partial<Record<MediaType, number>>;
  sources: { slug: string; name: string; count: number }[];
  saSections: { name: string; count: number }[];
  topicTree: FilterNode[];
  topicPathIds: number[];
  total: number;
  /** How many filters (type, source, section, topic) are active. */
  activeCount: number;
  /** The type of a preset page (/videos, /articles, /qa): the type section is hidden there. */
  fixedType?: MediaType;
}

/**
 * The library's filters: type, source, (Q&A) Shulchan Aruch section and topic. A sticky
 * sidebar on desktop; on mobile a button opens the same panel as a bottom sheet, which stays
 * open while filters change (counts update) until "show results".
 */
export function LibraryFilters(data: LibraryFilterData) {
  const [open, setOpen] = useState(false);
  const sheet = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useDialogFocus(sheet, open, close);
  const panel = <Panel {...data} />;

  return (
    <>
      <aside aria-label="סינון" className="hidden lg:block lg:w-72 flex-shrink-0 bg-white rounded-xl shadow p-5 sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto self-start">
        {panel}
      </aside>

      <div className="lg:hidden">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="w-full flex items-center justify-between gap-2 bg-white rounded-xl shadow px-4 py-3 font-medium"
          aria-haspopup="dialog"
        >
          <span className="flex items-center gap-2">
            <SlidersHorizontal className="w-5 h-5 text-primary" aria-hidden />
            סינון
            {data.activeCount > 0 && (
              <span className="min-w-5 h-5 px-1.5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">{data.activeCount}</span>
            )}
          </span>
          <ChevronDown className="w-5 h-5 text-muted-foreground" />
        </button>

        {open && (
          <div ref={sheet} className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="סינון">
            <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
            <div className="absolute inset-x-0 bottom-0 max-h-[88vh] flex flex-col bg-white rounded-t-2xl shadow-xl">
              <div className="flex items-center justify-between px-5 py-3 border-b">
                <h2 className="text-lg font-bold">סינון</h2>
                <button type="button" onClick={() => setOpen(false)} className="p-1 rounded-full hover:bg-secondary" aria-label="סגור">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto px-5 py-4">{panel}</div>
              <div className="flex items-center gap-3 px-5 py-3 border-t">
                {data.activeCount > 0 && (
                  <Link prefetch={false} href={libraryHref({ q: data.state.q, type: data.fixedType })} scroll={false} className="px-4 py-2.5 rounded-lg border font-medium">
                    ניקוי
                  </Link>
                )}
                <button type="button" onClick={() => setOpen(false)} className="flex-1 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold">
                  הצגת {data.total.toLocaleString('he-IL')} תוצאות
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-6 last:mb-0">
      <h3 className="text-sm font-bold text-muted-foreground mb-2">{title}</h3>
      {children}
    </section>
  );
}

const pill = (active: boolean) =>
  `inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
    active ? 'bg-primary text-primary-foreground' : 'bg-secondary hover:bg-secondary/70'
  }`;

function Panel({ state, typeCounts, sources, saSections, topicTree, topicPathIds, fixedType }: LibraryFilterData) {
  const href = (change: Partial<Omit<LibraryState, 'page'>>) => libraryHref(withChange(state, change));

  return (
    <div>
      {!fixedType && (
        <Section title="סוג תוכן">
          <div className="flex flex-wrap gap-2">
            <Link prefetch={false} href={href({ type: undefined })} scroll={false} className={pill(!state.type)}>הכל</Link>
            {MEDIA_TYPES.map((t) => {
              const count = typeCounts[t.key] ?? 0;
              if (!count && state.type !== t.key) return null;
              return (
                <Link prefetch={false} key={t.key} href={href({ type: t.key })} scroll={false} className={pill(state.type === t.key)}>
                  {t.label} <span className="text-xs opacity-75">{count.toLocaleString('he-IL')}</span>
                </Link>
              );
            })}
          </div>
        </Section>
      )}

      {saSections.length > 0 && (
        <Section title="חלק בשולחן ערוך">
          <div className="flex flex-wrap gap-2">
            <Link prefetch={false} href={href({ sa: undefined })} scroll={false} className={pill(!state.sa)}>הכל</Link>
            {saSections.map((s) => (
              <Link prefetch={false} key={s.name} href={href({ sa: s.name })} scroll={false} className={pill(state.sa === s.name)}>
                {s.name} <span className="text-xs opacity-75">{s.count}</span>
              </Link>
            ))}
          </div>
        </Section>
      )}

      {sources.length > 0 && (
        <Section title="מקור">
          <ul className="space-y-0.5">
            <li>
              <Link prefetch={false} href={href({ source: undefined })} scroll={false} className={row(!state.source)}>
                <span>כל המקורות</span>
              </Link>
            </li>
            {sources.map((s) => (
              <li key={s.slug}>
                <Link prefetch={false} href={href({ source: s.slug })} scroll={false} className={row(state.source === s.slug)}>
                  <span>{s.name}</span>
                  <span className="text-xs opacity-75">{s.count.toLocaleString('he-IL')}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Section>
      )}

      <Section title="נושא">
        <TopicTree tree={topicTree} currentPathIds={topicPathIds} href={(id) => href({ topic: id ?? undefined })} />
      </Section>
    </div>
  );
}

const row = (active: boolean) =>
  `flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-sm ${active ? 'bg-primary text-primary-foreground font-semibold' : 'hover:bg-secondary'}`;

function TopicTree({ tree, currentPathIds, href }: { tree: FilterNode[]; currentPathIds: number[]; href: (id: number | null) => string }) {
  const [query, setQuery] = useState('');
  const matches = useMemo(() => (query.trim().length >= 2 ? searchTree(tree, query.trim()) : null), [tree, query]);
  const currentId = currentPathIds.at(-1) ?? null;

  return (
    <div>
      <label className="relative block mb-3">
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

      <Link prefetch={false} href={href(null)} scroll={false} className={row(!currentId)}>
        <span>כל הנושאים</span>
      </Link>

      {matches ? (
        <ul className="space-y-0.5 mt-0.5">
          {matches.length === 0 && <li className="text-sm text-muted-foreground px-3 py-2">לא נמצאו נושאים</li>}
          {matches.map(({ node, path }) => (
            <li key={node.id}>
              <Link prefetch={false} href={href(node.id)} scroll={false} className={`block px-3 py-2 rounded-lg text-sm hover:bg-secondary ${node.id === currentId ? 'bg-primary/10 text-primary font-semibold' : ''}`}>
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
        <ul className="space-y-0.5 mt-0.5">
          {tree.map((node) => (
            <TreeItem key={node.id} node={node} currentPathIds={currentPathIds} href={href} />
          ))}
        </ul>
      )}
    </div>
  );
}

function TreeItem({ node, currentPathIds, href }: { node: FilterNode; currentPathIds: number[]; href: (id: number | null) => string }) {
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
        <Link prefetch={false}
          href={href(node.id)}
          scroll={false}
          className={`flex-1 flex items-center justify-between gap-2 py-2 pl-3 ${node.depth === 0 ? 'font-semibold' : 'text-sm'}`}
        >
          <span>{node.name}</span>
          <span className={`text-xs ${isCurrent ? 'opacity-80' : 'text-muted-foreground'}`}>{node.count}</span>
        </Link>
      </div>
      {hasChildren && expanded && (
        <ul className="mr-4 border-r pr-1 space-y-0.5">
          {node.children.map((child) => (
            <TreeItem key={child.id} node={child} currentPathIds={currentPathIds} href={href} />
          ))}
        </ul>
      )}
    </li>
  );
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
