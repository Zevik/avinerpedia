import { OG_IMAGES, pageMetadata } from '@/lib/seo';
import { LibraryView } from '@/components/library/LibraryView';

export const metadata = pageMetadata({
  title: "שו\"ת הלכה - שאלות ותשובות עם הרב שלמה אבינר | אבינרפדיה",
  description: "שאלות ותשובות בהלכה ובאמונה עם הרב שלמה אבינר, מסודרות לפי נושאים: אורח חיים, יורה דעה, אבן העזר, חושן משפט ועוד.",
  path: '/qa',
  image: OG_IMAGES.qa,
});

/** The library with the "Q&A" type preset; adds the Shulchan Aruch section filter. */
export default async function QAPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return <LibraryView heading='שו"ת הלכה' fixedType="qa" searchParams={await searchParams} />;
}
