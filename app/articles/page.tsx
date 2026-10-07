import { OG_IMAGES, libraryMetadata, type PageSearchParams } from '@/lib/seo';
import { LibraryView } from '@/components/library/LibraryView';

const META = {
  title: "מאמרים - הרב שלמה אבינר | אבינרפדיה",
  description: "אלפי מאמרים של הרב שלמה אבינר באמונה, הלכה, חינוך, זוגיות, מדינת ישראל ועוד, עם סינון לפי נושא.",
  path: '/articles',
  image: OG_IMAGES.articles,
};

// Searched, filtered, re-sorted and later-page views are noindex (isFilteredLibraryUrl).
export async function generateMetadata({ searchParams }: { searchParams: PageSearchParams }) {
  return libraryMetadata(META, searchParams, 'article');
}

/** The library with the "article" type preset. */
export default async function ArticlesPage({ searchParams }: { searchParams: PageSearchParams }) {
  return <LibraryView heading="מאמרים" fixedType="article" searchParams={await searchParams} />;
}
