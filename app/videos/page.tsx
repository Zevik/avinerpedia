import { OG_IMAGES, libraryMetadata, type PageSearchParams } from '@/lib/seo';
import { LibraryView } from '@/components/library/LibraryView';

const META = {
  title: "סרטונים - שיעורי וידאו של הרב שלמה אבינר | אבינרפדיה",
  description: "אלפי שיעורי וידאו של הרב שלמה אבינר בכל נושאי התורה, ההלכה, האמונה והמדינה, עם סינון לפי נושא.",
  path: '/videos',
  image: OG_IMAGES.videos,
};

// Searched, filtered, re-sorted and later-page views are noindex (isFilteredLibraryUrl).
export async function generateMetadata({ searchParams }: { searchParams: PageSearchParams }) {
  return libraryMetadata(META, searchParams, 'video');
}

/** The library with the "video" type preset (series episodes are on /series). */
export default async function VideosPage({ searchParams }: { searchParams: PageSearchParams }) {
  return <LibraryView heading="סרטונים" fixedType="video" searchParams={await searchParams} />;
}
