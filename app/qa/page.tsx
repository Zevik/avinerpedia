import { pageMetadata } from '@/lib/seo';
import { FilteredContentPage } from '@/components/FilteredContentPage';

export const metadata = pageMetadata({
  title: "שו\"ת הלכה - שאלות ותשובות עם הרב שלמה אבינר | אבינרפדיה",
  description: "שאלות ותשובות בהלכה ובאמונה עם הרב שלמה אבינר, מסודרות לפי נושאים: אורח חיים, יורה דעה, אבן העזר, חושן משפט ועוד.",
  path: '/qa',
});

export default async function QAPage({ searchParams }: { searchParams: Promise<{ topic?: string; sa?: string }> }) {
  return (
    <FilteredContentPage
      title='שו"ת הלכה'
      basePath="/qa"
      scope='שו"ת הלכה'
      baseFilters={{ main_category: 'שו"ת הלכה' }}
      type="qa"
      searchParams={await searchParams}
      withSaSections
    />
  );
}
