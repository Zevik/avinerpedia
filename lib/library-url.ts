/**
 * Library filter state and URLs (no server imports: used by client components too).
 * See lib/library.ts for the queries.
 */

export const MEDIA_TYPES = [
  { key: 'article', label: 'מאמרים', single: 'מאמר' },
  { key: 'video', label: 'סרטונים', single: 'וידאו' },
  { key: 'qa', label: 'שו"ת', single: 'שו"ת' },
  { key: 'series', label: 'סדרות', single: 'שיעור בסדרה' },
] as const;
export type MediaType = (typeof MEDIA_TYPES)[number]['key'];
export const isMediaType = (v: unknown): v is MediaType => MEDIA_TYPES.some((t) => t.key === v);

/** Types that have a page of their own; the library links to it instead of /library?type=. */
export const TYPE_PATHS: Partial<Record<MediaType, string>> = { article: '/articles', video: '/videos', qa: '/qa' };
export const LIBRARY_PAGE_SIZE = 30;

/** The filter state of a library page; everything is in the URL. */
export interface LibraryState {
  q?: string;
  type?: MediaType;
  topic?: number;
  /** Source slug. */
  source?: string;
  /** Shulchan Aruch section (Q&A only). */
  sa?: string;
  /**
   * 'newest' when the visitor asked for it. Otherwise the default: relevance when searching,
   * episode order for series, else the daily shuffle ("מומלץ היום", lib/daily.ts).
   */
  sort?: 'newest';
  page: number;
}

export type LibrarySort = 'relevance' | 'series' | 'daily' | 'newest';

/** The order a state is shown in. */
export function effectiveSort(state: Pick<LibraryState, 'q' | 'type' | 'sort'>): LibrarySort {
  if (state.q) return 'relevance';
  if (state.sort === 'newest') return 'newest';
  return state.type === 'series' ? 'series' : 'daily';
}

/** URL of a library state: the type's own page when it has one, else /library. */
export function libraryHref(state: Omit<LibraryState, 'page'> & { page?: number }): string {
  const path = (state.type && TYPE_PATHS[state.type]) || '/library';
  const params = new URLSearchParams();
  if (state.q) params.set('q', state.q);
  if (state.type && !TYPE_PATHS[state.type]) params.set('type', state.type);
  if (state.topic) params.set('topic', String(state.topic));
  if (state.source) params.set('source', state.source);
  if (state.sa && state.type === 'qa') params.set('sa', state.sa);
  if (state.sort === 'newest') params.set('sort', 'newest');
  if (state.page && state.page > 1) params.set('page', String(state.page));
  const qs = params.toString();
  return qs ? `${path}?${qs}` : path;
}

type SearchParams = Record<string, string | string[] | undefined>;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)?.trim() || undefined;

/**
 * The state from a page's query string. `fixedType` is the type of a preset page (/videos,
 * /articles, /qa). The topic is returned raw: it may be a node id or (old links) a name,
 * resolved against the tree by the page.
 */
export function parseLibraryState(sp: SearchParams, fixedType?: MediaType): LibraryState & { topicParam?: string } {
  const type = fixedType ?? (isMediaType(first(sp.type)) ? (first(sp.type) as MediaType) : undefined);
  return {
    q: first(sp.q)?.slice(0, 200),
    type,
    topicParam: first(sp.topic),
    source: first(sp.source),
    sa: type === 'qa' ? first(sp.sa) : undefined,
    sort: first(sp.sort) === 'newest' ? 'newest' : undefined,
    page: Math.max(1, Math.min(1000, Number(first(sp.page)) || 1)),
  };
}

/** A state with one axis changed; any change returns to page 1, and leaving Q&A drops the section. */
export function withChange(state: LibraryState, change: Partial<Omit<LibraryState, 'page'>>): LibraryState {
  const next = { ...state, ...change, page: 1 };
  if (next.type !== 'qa') next.sa = undefined;
  return next;
}
