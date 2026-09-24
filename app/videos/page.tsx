export const dynamic = 'force-dynamic';
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
      baseFilters={{ has_video: true }}
      type="video"
      searchParams={await searchParams}
    />
  );
}
