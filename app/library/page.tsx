import { pageMetadata } from '@/lib/seo';
import { LibraryView } from '@/components/library/LibraryView';

export const metadata = pageMetadata({
  title: 'ספריית התכנים - כל שיעורי הרב שלמה אבינר | אבינרפדיה',
  description: 'כל המאמרים, השיעורים, השו"ת והסדרות של הרב שלמה אבינר במקום אחד: חיפוש וסינון לפי נושא, סוג תוכן ומקור.',
  path: '/library',
});

export default async function LibraryPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return <LibraryView heading="ספריית התכנים" searchParams={await searchParams} />;
}
