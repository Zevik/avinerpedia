import { OG_IMAGES, libraryMetadata, type PageSearchParams } from '@/lib/seo';
import { LibraryView } from '@/components/library/LibraryView';

const META = {
  title: "שו\"ת הלכה - שאלות ותשובות עם הרב שלמה אבינר | אבינרפדיה",
  description: "שאלות ותשובות בהלכה ובאמונה עם הרב שלמה אבינר, מסודרות לפי נושאים: אורח חיים, יורה דעה, אבן העזר, חושן משפט ועוד.",
  path: '/qa',
  image: OG_IMAGES.qa,
};

// Searched, filtered, re-sorted and later-page views are noindex (isFilteredLibraryUrl).
export async function generateMetadata({ searchParams }: { searchParams: PageSearchParams }) {
  return libraryMetadata(META, searchParams, 'qa');
}

/** The library with the "Q&A" type preset; adds the Shulchan Aruch section filter. */
export default async function QAPage({ searchParams }: { searchParams: PageSearchParams }) {
  return <LibraryView heading='שו"ת הלכה' fixedType="qa" searchParams={await searchParams} />;
}
