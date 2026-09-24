// Cached for a day (lib/cache.ts); admin saves purge it via /api/revalidate.
export const revalidate = 86400;
import { OG_IMAGES, pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata({
  title: "סדרות לימוד - שיעורי הרב שלמה אבינר | אבינרפדיה",
  description: "סדרות שיעורים של הרב שלמה אבינר לפי הסדר: אורות, אורות התחיה, עין איה, כוזרי, שמונה פרקים לרמב\"ם ועוד.",
  path: '/series',
  image: OG_IMAGES.series,
});
import { SeriesCard } from '@/components/SeriesCard';
import { getAllSeries } from '@/lib/taxonomy';

export default async function SeriesPage() {
  const series = await getAllSeries();
  const totalEpisodes = series.reduce((sum, s) => sum + s.episode_count, 0);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20 py-8">
      <div className="container mx-auto px-4">
        <h1 className="text-4xl font-bold mb-2">סדרות לימוד</h1>
        <p className="text-muted-foreground mb-8">
          {series.length} סדרות, {totalEpisodes} שיעורים לפי הסדר
        </p>

        {series.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {series.map((s) => (
              <SeriesCard key={s.id} id={s.id} name={s.name} episodeCount={s.episode_count} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <p className="text-xl text-muted-foreground">לא נמצאו סדרות לימוד</p>
          </div>
        )}
      </div>
    </div>
  );
}
