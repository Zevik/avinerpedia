import { libraryMetadata, type PageSearchParams } from '@/lib/seo';
import { LibraryView } from '@/components/library/LibraryView';

const META = {
  title: 'ספריית התכנים - כל שיעורי הרב שלמה אבינר | אבינרפדיה',
  description: 'כל המאמרים, השיעורים, השו"ת והסדרות של הרב שלמה אבינר במקום אחד: חיפוש וסינון לפי נושא, סוג תוכן ומקור.',
  path: '/library',
};

// Searched, filtered, re-sorted and later-page views are noindex (isFilteredLibraryUrl).
export async function generateMetadata({ searchParams }: { searchParams: PageSearchParams }) {
  return libraryMetadata(META, searchParams);
}

export default async function LibraryPage({ searchParams }: { searchParams: PageSearchParams }) {
  return <LibraryView heading="ספריית התכנים" searchParams={await searchParams} />;
}
