import { OG_IMAGES, pageMetadata } from '@/lib/seo';
import { FilteredContentPage } from '@/components/FilteredContentPage';

export const metadata = pageMetadata({
  title: "מאמרים - הרב שלמה אבינר | אבינרפדיה",
  description: "אלפי מאמרים של הרב שלמה אבינר באמונה, הלכה, חינוך, זוגיות, מדינת ישראל ועוד, עם סינון לפי נושא.",
  path: '/articles',
  image: OG_IMAGES.articles,
});

export default async function ArticlesPage({ searchParams }: { searchParams: Promise<{ topic?: string }> }) {
  return (
    <FilteredContentPage
      title="מאמרים"
      basePath="/articles"
      scope="מאמרים"
      baseFilters={{ main_category: 'מאמרים' }}
      type="article"
      searchParams={await searchParams}
    />
  );
}
