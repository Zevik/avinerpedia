/**
 * Topic selection in the admin form. An item is stored linked to its chosen nodes AND their
 * ancestors (so a core topic matches everything beneath it); the form shows and edits only the
 * most specific ones — the ancestors are implied.
 */

export type ParentOf = Map<number, number | null>;

export function ancestorsOf(id: number, parentOf: ParentOf): number[] {
  const out: number[] = [];
  for (let p = parentOf.get(id) ?? null; p != null; p = parentOf.get(p) ?? null) out.push(p);
  return out;
}

/** The chosen nodes from an item's stored links: drop every node that is an ancestor of another. */
export function specificSelection(linked: number[], parentOf: ParentOf): number[] {
  const implied = new Set(linked.flatMap((id) => ancestorsOf(id, parentOf)));
  return linked.filter((id) => !implied.has(id));
}

/**
 * Select or unselect a node. Selecting drops its ancestors and descendants from the selection
 * (an ancestor is implied; a descendant would make the new choice redundant).
 */
export function toggleNode(selected: number[], id: number, parentOf: ParentOf): number[] {
  if (selected.includes(id)) return selected.filter((x) => x !== id);
  const ancestors = new Set(ancestorsOf(id, parentOf));
  return [...selected.filter((x) => !ancestors.has(x) && !ancestorsOf(x, parentOf).includes(id)), id];
}

/** Nodes implied by the selection (ancestors of chosen nodes), shown as included. */
export function impliedNodes(selected: number[], parentOf: ParentOf): Set<number> {
  return new Set(selected.flatMap((id) => ancestorsOf(id, parentOf)));
}
