import { OG_IMAGES, pageMetadata } from '@/lib/seo';
import { LibraryView } from '@/components/library/LibraryView';

export const metadata = pageMetadata({
  title: "מאמרים - הרב שלמה אבינר | אבינרפדיה",
  description: "אלפי מאמרים של הרב שלמה אבינר באמונה, הלכה, חינוך, זוגיות, מדינת ישראל ועוד, עם סינון לפי נושא.",
  path: '/articles',
  image: OG_IMAGES.articles,
});

/** The library with the "article" type preset. */
export default async function ArticlesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return <LibraryView heading="מאמרים" fixedType="article" searchParams={await searchParams} />;
}
