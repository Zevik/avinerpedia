import { describe, it, expect } from 'vitest';
import { dailySeed, seededShuffle } from '../../lib/daily';

describe('daily shuffle', () => {
  it('the seed is the date in Israel (the day turns at midnight Israel time)', () => {
    // 21:30 UTC on Sep 24 is 00:30 on Sep 25 in Israel (UTC+3 in summer).
    expect(dailySeed(new Date('2026-09-24T21:30:00Z'))).toBe('2026-09-25');
    expect(dailySeed(new Date('2026-09-24T20:30:00Z'))).toBe('2026-09-24');
  });

  it('same seed, same order; another day, another order; nothing lost', () => {
    const items = Array.from({ length: 30 }, (_, i) => i);
    const a = seededShuffle(items, '2026-09-25');
    expect(seededShuffle(items, '2026-09-25')).toEqual(a);
    expect(seededShuffle(items, '2026-09-26')).not.toEqual(a);
    expect([...a].sort((x, y) => x - y)).toEqual(items);
    expect(items[0]).toBe(0); // the input is not modified
  });
});
