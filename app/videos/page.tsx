import { pageMetadata } from '@/lib/seo';
import { FilteredContentPage } from '@/components/FilteredContentPage';

export const metadata = pageMetadata({
  title: "סרטונים - שיעורי וידאו של הרב שלמה אבינר | אבינרפדיה",
  description: "אלפי שיעורי וידאו של הרב שלמה אבינר בכל נושאי התורה, ההלכה, האמונה והמדינה, עם סינון לפי נושא.",
  path: '/videos',
});

export default async function VideosPage({ searchParams }: { searchParams: Promise<{ topic?: string }> }) {
  return (
    <FilteredContentPage
      title="סרטונים"
      basePath="/videos"
      scope="__has_video"
      // Series episodes are on /series, not here (counts: scripts/source/filter-counts.mjs).
      baseFilters={{ has_video: true, exclude_series: true }}
      type="video"
      searchParams={await searchParams}
    />
  );
}
