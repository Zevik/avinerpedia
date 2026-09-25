import Link from 'next/link';
import { BookOpen, CalendarDays, Heart, MessageSquareText, Scale, Search, Sparkles } from 'lucide-react';
import { ContentRow } from '@/components/home/ContentRow';
import { ItemRowCard, SeriesRowCard } from '@/components/home/RowCards';
import { dailySeed, seededShuffle } from '@/lib/daily';
import { getFilterTree } from '@/lib/filters';
import { getLibraryItems, getSources, libraryHref } from '@/lib/library';
import { pageMetadata } from '@/lib/seo';
import { getAllSeries } from '@/lib/taxonomy';

// The rows use the daily shuffle; regenerating hourly picks up the new day's order within an
// hour of midnight (the queries themselves are cached per day).
export const revalidate = 3600;

export const metadata = pageMetadata({
  title: "אבינרפדיה - כל שיעורי הרב שלמה אבינר",
  description: "ארכיון שיעורי הרב שלמה אבינר שליט\"א: אלפי סרטונים, מאמרים, שאלות ותשובות וסדרות לימוד, מסודרים לפי נושאים.",
  path: '/',
});

/** Quick-access tiles: core topics, a source and the series. */
const TILES = [
  { label: 'הלכה', topic: 'הלכה', Icon: Scale, cls: 'bg-emerald-50 text-emerald-700' },
  { label: 'אמונה', topic: 'אמונה', Icon: Sparkles, cls: 'bg-amber-50 text-amber-700' },
  { label: 'חגים ומועדים', topic: 'חגים ומועדים', Icon: CalendarDays, cls: 'bg-orange-50 text-orange-700' },
  { label: 'זוגיות ומשפחה', topic: 'זוגיות ומשפחה', Icon: Heart, cls: 'bg-rose-50 text-rose-700' },
  { label: 'שו"ת סמס', source: 'shut-sms', Icon: MessageSquareText, cls: 'bg-green-50 text-green-700' },
  { label: 'סדרות לימוד', href: '/series', Icon: BookOpen, cls: 'bg-blue-50 text-blue-700' },
] as const;

export default async function Home() {
  const [tree, sources, allSeries, pearls, videos, latest] = await Promise.all([
    getFilterTree('all'),
    getSources(),
    getAllSeries(),
    getLibraryItems({ page: 1 }, undefined, { limit: 12 }),
    getLibraryItems({ type: 'video', page: 1 }, undefined, { limit: 12 }),
    getLibraryItems({ sort: 'newest', page: 1 }, undefined, { limit: 12, types: ['qa', 'article'] }),
  ]);
  const sourceName = new Map(sources.map((s) => [s.id, s.name]));
  // The series in a daily order (their episodes keep theirs, on the series page).
  const series = seededShuffle(allSeries, dailySeed()).slice(0, 10);

  const tileHref = (tile: (typeof TILES)[number]) => {
    if ('href' in tile) return tile.href;
    if ('source' in tile) return libraryHref({ source: tile.source });
    const node = tree.find((n) => n.name === tile.topic);
    return node ? libraryHref({ topic: node.id }) : '/library';
  };

  return (
    <div className="bg-gradient-to-b from-background to-secondary/20">
      <section className="relative overflow-hidden bg-gradient-to-br from-blue-900 via-indigo-900 to-slate-900">
        <div className="absolute inset-0 opacity-20 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]" />
        <div className="relative z-10 container mx-auto px-4 py-8 md:py-12 text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-white drop-shadow">אבינרפדיה</h1>
          <p className="mt-2 text-base md:text-xl text-blue-100 font-light">
            הארכיון המקיף לשיעוריו ותורתו של הרב שלמה אבינר שליט"א
          </p>
          {/* Search goes to the content library. */}
          <form action="/library" method="get" role="search" className="relative mt-5 max-w-2xl mx-auto">
            <label htmlFor="home-q" className="sr-only">חיפוש בספריית התכנים</label>
            <Search className="w-5 h-5 absolute right-5 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden />
            <input
              id="home-q"
              name="q"
              type="search"
              placeholder='חפשו שיעור, מאמר, שו"ת או נושא...'
              className="w-full rounded-full bg-white text-gray-900 pr-12 pl-24 py-3.5 shadow-lg focus:outline-none focus:ring-4 focus:ring-blue-300/50"
            />
            <button type="submit" className="absolute left-1.5 top-1/2 -translate-y-1/2 px-5 py-2 rounded-full bg-blue-700 text-white font-semibold hover:bg-blue-800">
              חיפוש
            </button>
          </form>
        </div>
      </section>

      <div className="container mx-auto px-4 py-8 md:py-10">
        <nav aria-label="עיון מהיר" className="grid grid-cols-3 md:grid-cols-6 gap-2 md:gap-3 mb-8 md:mb-10">
          {TILES.map((tile) => (
            <Link
              prefetch={false}
              key={tile.label}
              href={tileHref(tile)}
              className="flex flex-col items-center justify-center gap-1.5 rounded-xl bg-white border border-gray-100 shadow-sm hover:shadow-md transition-shadow px-2 py-2.5 md:p-4 text-center"
            >
              <span className={`w-9 h-9 md:w-11 md:h-11 rounded-full flex items-center justify-center ${tile.cls}`}>
                <tile.Icon className="w-4 h-4 md:w-5 md:h-5" aria-hidden />
              </span>
              <span className="text-xs md:text-sm font-semibold leading-tight">{tile.label}</span>
            </Link>
          ))}
        </nav>

        <ContentRow title="פנינים מהארכיון" subtitle="מבחר מתחלף מדי יום" allHref="/library">
          {pearls.items.map((item) => (
            <ItemRowCard key={item.id} item={item} sourceName={item.source_id ? sourceName.get(item.source_id) : undefined} />
          ))}
        </ContentRow>

        <ContentRow title="סדרות לימוד מומלצות" allHref="/series">
          {series.map((s) => (
            <SeriesRowCard key={s.id} id={s.id} name={s.name} episodes={s.episode_count} />
          ))}
        </ContentRow>

        <ContentRow title="שיעורי וידאו" allHref="/videos">
          {videos.items.map((item) => (
            <ItemRowCard key={item.id} item={item} sourceName={item.source_id ? sourceName.get(item.source_id) : undefined} />
          ))}
        </ContentRow>

        <ContentRow title='שו"תים ומאמרים אחרונים' allHref={libraryHref({ sort: 'newest' })}>
          {latest.items.map((item) => (
            <ItemRowCard key={item.id} item={item} sourceName={item.source_id ? sourceName.get(item.source_id) : undefined} />
          ))}
        </ContentRow>
      </div>
    </div>
  );
}
