import { notFound } from 'next/navigation';
export const dynamic = 'force-dynamic';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, PlayCircle, FileText } from 'lucide-react';
import { getSeriesWithEpisodes } from '@/lib/taxonomy';

interface SeriesDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function SeriesDetailPage({ params }: SeriesDetailPageProps) {
  const { id } = await params;
  const data = await getSeriesWithEpisodes(Number(id));
  if (!data) notFound();

  const { series, episodes } = data;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        <Link href="/series" className="inline-flex items-center gap-2 text-primary hover:underline mb-6">
          <ArrowRight className="w-4 h-4" />
          <span>כל הסדרות</span>
        </Link>

        <h1 className="text-4xl font-bold mb-2">{series.name}</h1>
        <p className="text-muted-foreground mb-8">{episodes.length} שיעורים</p>

        {episodes.length > 0 && (
          <Link
            href={`/content/${episodes[0].id}`}
            className="inline-flex items-center gap-2 px-6 py-3 mb-8 bg-primary text-white rounded-full hover:bg-primary/90 transition-colors font-semibold shadow-md"
          >
            <PlayCircle className="w-5 h-5" />
            <span>התחל מהשיעור הראשון</span>
          </Link>
        )}

        <ol className="space-y-3">
          {episodes.map((ep, i) => (
            <li key={ep.id}>
              <Link
                href={`/content/${ep.id}`}
                className="group flex items-center gap-4 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow p-4"
              >
                <span className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center">
                  {ep.series_order ?? i + 1}
                </span>
                <span className="flex-1 min-w-0 font-medium group-hover:text-primary transition-colors">
                  {ep.title}
                </span>
                {ep.video_id ? (
                  <PlayCircle className="w-5 h-5 text-muted-foreground flex-shrink-0" aria-label="וידאו" />
                ) : (
                  <FileText className="w-5 h-5 text-muted-foreground flex-shrink-0" aria-label="טקסט" />
                )}
                <ArrowLeft className="w-4 h-4 text-primary flex-shrink-0" />
              </Link>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
