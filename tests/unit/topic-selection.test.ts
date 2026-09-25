import { describe, it, expect } from 'vitest';
import { ancestorsOf, impliedNodes, specificSelection, toggleNode } from '../../lib/topic-selection';

// 1 הלכה › 2 שבת › 3 הלכות שבת ; 1 › 4 כשרות ; 5 אמונה
const parentOf = new Map<number, number | null>([[1, null], [2, 1], [3, 2], [4, 1], [5, null]]);

describe('topic selection', () => {
  it('ancestors, nearest first', () => {
    expect(ancestorsOf(3, parentOf)).toEqual([2, 1]);
    expect(ancestorsOf(5, parentOf)).toEqual([]);
  });

  it('stored links (with ancestors) -> only the most specific nodes', () => {
    expect(specificSelection([1, 2, 3, 4, 5], parentOf)).toEqual([3, 4, 5]);
    expect(specificSelection([1], parentOf)).toEqual([1]);
  });

  it('selecting a node drops its ancestors and descendants; selecting again removes it', () => {
    expect(toggleNode([1], 3, parentOf)).toEqual([3]);
    expect(toggleNode([3, 5], 2, parentOf)).toEqual([5, 2]);
    expect(toggleNode([3, 5], 3, parentOf)).toEqual([5]);
  });

  it('implied nodes are the ancestors of the selection', () => {
    expect([...impliedNodes([3, 5], parentOf)].sort()).toEqual([1, 2]);
  });
});
