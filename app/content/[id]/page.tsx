import { cache } from 'react';
import { displayTitle } from '@/lib/utils';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
// Cached for a day (lib/cache.ts); admin saves purge it via /api/revalidate.
export const revalidate = 86400;
// No pages at build time; each one is rendered on its first visit, then served from the cache.
export async function generateStaticParams() {
  return [];
}
import { describe, pageMetadata, videoThumbnail } from '@/lib/seo';
import { Calendar, Tag } from 'lucide-react';
import { getContentItemById } from '@/lib/db';
import { ContentRenderer } from '@/components/ContentRenderer';
import { getVimeoId, meirLessonUrl } from '@/lib/video';
import { getSeriesNavigation } from '@/lib/taxonomy';
import { getContentNodes } from '@/lib/filters';
import { SeriesNav } from '@/components/SeriesNav';
import { TopicChips } from '@/components/TopicChips';

interface ContentPageProps {
  params: Promise<{ id: string }>;
}

// Shared by generateMetadata and the page, so the item is fetched once per request.
const getItem = cache((id: string) => getContentItemById(parseInt(id, 10)));

export async function generateMetadata({ params }: ContentPageProps): Promise<Metadata> {
  const { id } = await params;
  const item = await getItem(id);
  if (!item || !item.is_active) return { title: 'הדף לא נמצא | אבינרפדיה', robots: { index: false } };

  return pageMetadata({
    title: `${displayTitle(item.title)} - הרב שלמה אבינר | אבינרפדיה`,
    description: describe(item.summary, item.content_md),
    path: `/content/${item.id}`,
    image: await videoThumbnail(item.video_id),
    type: 'article',
  });
}

export default async function ContentPage({ params }: ContentPageProps) {
  const { id } = await params;
  const item = await getItem(id);

  // Hidden items (redirects, dead-video-only pages) stay reachable in /admin but not here.
  if (!item || !item.is_active) {
    notFound();
  }

  // Resolve Vimeo ID if it's a Machon Meir video
  const meirId = item.video_id?.includes('Meir:') ? item.video_id.replace('Meir:', '').split('&')[0] : null;
  const [vimeoId, seriesNav, topics] = await Promise.all([
    meirId ? getVimeoId(meirId) : null,
    getSeriesNavigation(item),
    getContentNodes(item.id, item.primary_node_id),
  ]);

  const renderByCategory = () => {
    // If item has video_id, show video layout (for videos and video-based series)
    if (item.video_id && item.video_id.trim().length > 0) {
      return <VideoContent item={item} vimeoId={vimeoId} />;
    }

    // Check if article content looks like Q&A (starts with ש: or שאלה:)
    const isQAFormat = item.content_md &&
      (item.content_md.trim().match(/^(ש:|שאלה:)/m) ||
        item.content_md.match(/^\s*(ש:|שאלה:)/));

    // Choose layout by category or content format
    if (item.main_category === 'שו"ת הלכה' || isQAFormat) {
      return <QAContent item={item} />;
    }

    // Default to article layout
    return <ArticleContent item={item} />;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20 py-8">
      {seriesNav && <SeriesNav {...seriesNav} />}
      {renderByCategory()}
      <TopicChips topics={topics} tags={item.original_tags ? item.original_tags.split(' | ').filter(Boolean) : []} />
    </div>
  );
}

// Video Content Layout
function VideoContent({ item, vimeoId }: { item: any, vimeoId?: string | null }) {
  const videoId = item.video_id;
  const isMaale = videoId && videoId.includes('Maale:');
  const isMeir = videoId && videoId.includes('Meir:');
  const isYouTube = videoId && !isMaale && !isMeir;

  return (
    <div className="container mx-auto px-4 max-w-6xl">
      {/* Video Player */}
      <div className="bg-black rounded-lg overflow-hidden shadow-2xl mb-8">
        {isYouTube ? (
          <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
            <iframe
              className="absolute top-0 left-0 w-full h-full"
              src={`https://www.youtube-nocookie.com/embed/${videoId}`}
              title={displayTitle(item.title)}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        ) : isMaale ? (
          <div className="w-full h-96 flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/10">
            <div className="text-center">
              <p className="text-lg text-muted-foreground mb-4">
                סרטון זה מתארח בפלטפורמת מעלה
              </p>
              <a
                href={`https://www.maale.org.il/${videoId.replace('Maale:', '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
              >
                צפו בסרטון במעלה
              </a>
            </div>
          </div>
        ) : isMeir && vimeoId ? (
          // Only the bare Vimeo player: embedding the meirtv.com page itself would bring its
          // cookie banner, ads and chat widget into our site.
          <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
            <iframe
              className="absolute top-0 left-0 w-full h-full"
              src={`https://player.vimeo.com/video/${vimeoId}?dnt=1`}
              title={displayTitle(item.title)}
              allow="autoplay; fullscreen; picture-in-picture"
              allowFullScreen
            />
          </div>
        ) : isMeir ? (
          <div className="w-full h-96 flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/10">
            <div className="text-center">
              <p className="text-lg text-muted-foreground mb-4">
                השיעור מתארח באתר מכון מאיר
              </p>
              <a
                href={meirLessonUrl(videoId.replace('Meir:', ''))}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
              >
                צפו בשיעור במכון מאיר
              </a>
            </div>
          </div>
        ) : (
          <div className="w-full h-96 flex items-center justify-center bg-muted">
            <p className="text-muted-foreground">סרטון לא זמין</p>
          </div>
        )}
      </div>

      {/* Video Info */}
      <div className="bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-3xl md:text-4xl font-bold mb-4">{displayTitle(item.title)}</h1>

        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-6">
          {item.publish_date && (
            <div className="flex items-center space-x-2 space-x-reverse">
              <Calendar className="w-4 h-4" />
              <span>{new Date(item.publish_date).toLocaleDateString('he-IL')}</span>
            </div>
          )}
          {item.sub_category && (
            <div className="flex items-center space-x-2 space-x-reverse">
              <Tag className="w-4 h-4" />
              <span>{item.sub_category}</span>
            </div>
          )}
        </div>

        {item.content_md && (
          <div className="border-t pt-6">
            <ContentRenderer content={stripVideoContent(item.content_md)} />
          </div>
        )}
      </div>
    </div>
  );
}

// Helper to remove video embeds from content since we show the main player
/**
 * The body under a video page's player: embeds removed (the player above shows the video).
 * Note: other embeds can't simply be kept — on 52 pages they are dead videos that
 * check-dead-videos replaced in video_id but left in the text.
 */
function stripVideoContent(content: string): string {
  if (!content) return '';

  return content
    // Remove Machon Meir tags (more flexible regex to catch IDs with parameters)
    .replace(/<machonMeeir(?:France|FR|IL|EN)?>(\d+).*?<\/machonMeeir(?:France|FR|IL|EN)?>/gi, '')
    // Remove video_id fields
    .replace(/video_id:\s*"?([\w-]+)"?/gi, '')
    // Remove standalone YouTube/Vimeo links
    .replace(/(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/gi, '')
    // Remove iframes
    .replace(/<iframe[^>]*>.*?<\/iframe>/gi, '')
    // Remove movieTitle divs often found in these pages
    .replace(/<div\s+class=["']?movieTitle["']?>.*?<\/div>/gis, '')
    // Remove empty divs left behind
    .replace(/<div>\s*<\/div>/gi, '')
    // Cleanup extra whitespace
    .trim();
}

// Q&A Content Layout (Chat style)
function QAContent({ item }: { item: any }) {
  // Check if content already contains Q&A format (ש: ת:)
  const hasInlineQA = item.content_md &&
    (item.content_md.match(/^(ש:|שאלה:)/m) ||
      item.content_md.match(/^\s*(ש:|שאלה:)/));

  // If content has inline Q&A, render as article with Q&A styling
  if (hasInlineQA) {
    return (
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="bg-white rounded-lg shadow-lg p-8">
          {/* Title */}
          <h1 className="text-3xl md:text-4xl font-bold mb-6 text-center">
            {displayTitle(item.title)}
          </h1>

          {/* Metadata */}
          <div className="mb-8 pb-6 border-b flex flex-wrap items-center justify-center gap-4 text-sm text-muted-foreground">
            {item.publish_date && (
              <div className="flex items-center space-x-2 space-x-reverse">
                <Calendar className="w-4 h-4" />
                <span>{new Date(item.publish_date).toLocaleDateString('he-IL')}</span>
              </div>
            )}
            {item.sub_category && (
              <div className="flex items-center space-x-2 space-x-reverse">
                <Tag className="w-4 h-4" />
                <span>{item.sub_category}</span>
              </div>
            )}
          </div>

          {/* Content with Q&A formatting */}
          {item.content_md && (
            <div className="prose prose-lg max-w-none">
              <ContentRenderer content={item.content_md} />
            </div>
          )}
        </div>
      </div>
    );
  }

  // Traditional Q&A layout: title as question, content as answer
  return (
    <div className="container mx-auto px-4 max-w-4xl">
      <div className="bg-white rounded-lg shadow-lg p-8">
        {/* Question Box */}
        <div className="mb-8">
          <div className="text-sm font-semibold text-primary mb-2">שאלה</div>
          <div className="bg-primary/5 border-r-4 border-primary rounded-lg p-6">
            <h1 className="text-2xl md:text-3xl font-bold leading-relaxed">
              {displayTitle(item.title)}
            </h1>
          </div>
        </div>

        {/* Answer Box */}
        {item.content_md && (
          <div>
            <div className="text-sm font-semibold text-green-600 mb-2">תשובה</div>
            <div className="bg-green-50 border-r-4 border-green-500 rounded-lg p-6">
              <ContentRenderer content={item.content_md} />
            </div>
          </div>
        )}

        {/* Metadata */}
        <div className="mt-8 pt-6 border-t flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
          {item.publish_date && (
            <div className="flex items-center space-x-2 space-x-reverse">
              <Calendar className="w-4 h-4" />
              <span>{new Date(item.publish_date).toLocaleDateString('he-IL')}</span>
            </div>
          )}
          {item.sub_category && (
            <div className="flex items-center space-x-2 space-x-reverse">
              <Tag className="w-4 h-4" />
              <span>{item.sub_category}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Article Content Layout (Clean blog style)
function ArticleContent({ item }: { item: any }) {
  return (
    <div className="container mx-auto px-4">
      <article className="max-w-3xl mx-auto bg-white rounded-lg shadow-lg p-8 md:p-12">
        {/* Article Header */}
        <header className="mb-8">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 leading-tight">
            {displayTitle(item.title)}
          </h1>

          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            {item.publish_date && (
              <div className="flex items-center space-x-2 space-x-reverse">
                <Calendar className="w-4 h-4" />
                <span>{new Date(item.publish_date).toLocaleDateString('he-IL')}</span>
              </div>
            )}
            {item.sub_category && (
              <div className="flex items-center space-x-2 space-x-reverse">
                <Tag className="w-4 h-4" />
                <span>{item.sub_category}</span>
              </div>
            )}
          </div>
        </header>

        {/* Article Body */}
        {item.content_md && (
          <div className="prose-headings:font-bold prose-headings:text-foreground">
            <ContentRenderer content={item.content_md} />
          </div>
        )}
      </article>
    </div>
  );
}
