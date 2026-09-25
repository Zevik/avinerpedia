/**
 * The daily shuffle ("מומלץ היום"): a fixed order for a whole day, a new one after midnight in
 * Israel. Deterministic, so pages stay cacheable and paging never repeats an item; the database
 * side is library_items(p_sort => 'daily', p_seed) (supabase/migrations/006_library_sort.sql).
 */

/** Today's date in Israel, "YYYY-MM-DD": the shuffle seed. */
export function dailySeed(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jerusalem', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

/** A copy of `items` in an order fixed by `seed` (FNV-1a hash of the seed into mulberry32). */
export function seededShuffle<T>(items: readonly T[], seed: string): T[] {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  let state = h >>> 0;
  const random = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
