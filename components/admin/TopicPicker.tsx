'use client';

import { useMemo, useState } from 'react';
import { ChevronDown, ChevronLeft, Search, Star, X } from 'lucide-react';
import { impliedNodes, toggleNode, type ParentOf } from '@/lib/topic-selection';

export interface PickerNode {
  id: number;
  name: string;
  path: string;
  parent_id: number | null;
  sort_order: number;
}

interface TopicPickerProps {
  nodes: PickerNode[];
  selected: number[];
  primary: number | null;
  onChange: (selected: number[], primary: number | null) => void;
}

/**
 * Picks an item's topics from the curated tree: chips for the chosen nodes (★ marks the primary
 * one, shown on cards), a search over all levels, and the tree with checkboxes. Ancestors of a
 * chosen node are included automatically (shown as "כלול").
 */
export function TopicPicker({ nodes, selected, primary, onChange }: TopicPickerProps) {
  const [query, setQuery] = useState('');
  const { byId, parentOf, children } = useMemo(() => {
    const byId = new Map(nodes.map((n) => [n.id, n]));
    const parentOf: ParentOf = new Map(nodes.map((n) => [n.id, n.parent_id]));
    const children = new Map<number | null, PickerNode[]>();
    for (const n of nodes) children.set(n.parent_id, [...(children.get(n.parent_id) || []), n]);
    for (const list of children.values()) list.sort((a, b) => a.sort_order - b.sort_order);
    return { byId, parentOf, children };
  }, [nodes]);
  const implied = useMemo(() => impliedNodes(selected, parentOf), [selected, parentOf]);
  const matches = useMemo(() => {
    const q = query.trim();
    return q.length >= 2 ? nodes.filter((n) => n.name.includes(q)).slice(0, 20) : null;
  }, [nodes, query]);

  const toggle = (id: number) => {
    const next = toggleNode(selected, id, parentOf);
    onChange(next, next.includes(primary ?? -1) ? primary : next[0] ?? null);
  };
  const shortPath = (n: PickerNode) => n.path;

  return (
    <div className="space-y-3">
      {selected.length > 0 ? (
        <ul className="flex flex-wrap gap-2" aria-label="נושאים שנבחרו">
          {selected.map((id) => {
            const n = byId.get(id);
            if (!n) return null;
            const isPrimary = id === primary;
            return (
              <li key={id} className={`inline-flex items-center gap-1 rounded-full pr-3 pl-1 py-1 text-sm ${isPrimary ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-800'}`}>
                <span>{shortPath(n)}</span>
                <button
                  type="button"
                  onClick={() => onChange(selected, id)}
                  className="p-1 rounded-full hover:bg-black/10"
                  aria-label={isPrimary ? `${n.name}: הנושא הראשי` : `הגדרת ${n.name} כנושא ראשי`}
                  aria-pressed={isPrimary}
                  title="נושא ראשי (מוצג בכרטיס)"
                >
                  <Star className="w-3.5 h-3.5" fill={isPrimary ? 'currentColor' : 'none'} />
                </button>
                <button type="button" onClick={() => toggle(id)} className="p-1 rounded-full hover:bg-black/10" aria-label={`הסרת ${n.name}`}>
                  <X className="w-3.5 h-3.5" />
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-sm text-gray-500">לא נבחרו נושאים. בחרו מהעץ או חפשו נושא.</p>
      )}

      <label className="relative block">
        <span className="sr-only">חיפוש נושא</span>
        <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="חיפוש נושא... (למשל: חנוכה, שבת, כשרות)"
          className="w-full border rounded-lg pr-9 pl-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
        />
      </label>

      <div className="border rounded-lg max-h-72 overflow-y-auto p-2" role="group" aria-label="עץ הנושאים">
        {matches ? (
          <ul className="space-y-0.5">
            {matches.length === 0 && <li className="text-sm text-gray-500 px-2 py-1">לא נמצאו נושאים</li>}
            {matches.map((n) => (
              <li key={n.id}>
                <NodeCheckbox node={n} label={shortPath(n)} checked={selected.includes(n.id)} included={implied.has(n.id)} onToggle={toggle} />
              </li>
            ))}
          </ul>
        ) : (
          <ul className="space-y-0.5">
            {(children.get(null) || []).map((n) => (
              <TreeNode key={n.id} node={n} childrenOf={children} selected={selected} implied={implied} onToggle={toggle} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function NodeCheckbox({ node, label, checked, included, onToggle }: {
  node: PickerNode; label: string; checked: boolean; included: boolean; onToggle: (id: number) => void;
}) {
  return (
    <label className={`flex items-center gap-2 px-2 py-1 rounded cursor-pointer hover:bg-gray-50 text-sm ${checked ? 'font-semibold text-blue-800' : ''}`}>
      <input type="checkbox" checked={checked || included} onChange={() => onToggle(node.id)} className={`w-4 h-4 accent-blue-600 ${included && !checked ? 'opacity-50' : ''}`} />
      <span>{label}</span>
      {included && !checked && <span className="text-xs text-gray-400">כלול</span>}
    </label>
  );
}

function TreeNode({ node, childrenOf, selected, implied, onToggle }: {
  node: PickerNode;
  childrenOf: Map<number | null, PickerNode[]>;
  selected: number[];
  implied: Set<number>;
  onToggle: (id: number) => void;
}) {
  const kids = childrenOf.get(node.id) || [];
  const [open, setOpen] = useState(implied.has(node.id));
  return (
    <li>
      <div className="flex items-center">
        {kids.length > 0 ? (
          <button type="button" onClick={() => setOpen((o) => !o)} className="p-1 text-gray-500" aria-label={open ? `כווץ ${node.name}` : `הרחב ${node.name}`} aria-expanded={open}>
            {open ? <ChevronDown className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        ) : (
          <span className="w-6" />
        )}
        <div className="flex-1">
          <NodeCheckbox node={node} label={node.name} checked={selected.includes(node.id)} included={implied.has(node.id)} onToggle={onToggle} />
        </div>
      </div>
      {open && kids.length > 0 && (
        <ul className="mr-6 border-r pr-1 space-y-0.5">
          {kids.map((k) => (
            <TreeNode key={k.id} node={k} childrenOf={childrenOf} selected={selected} implied={implied} onToggle={onToggle} />
          ))}
        </ul>
      )}
    </li>
  );
}
