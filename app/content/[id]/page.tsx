import { notFound } from 'next/navigation';
export const dynamic = 'force-dynamic';
import { Calendar, Tag } from 'lucide-react';
import { getContentItemById } from '@/lib/db';
import { ContentRenderer } from '@/components/ContentRenderer';

interface ContentPageProps {
  params: Promise<{ id: string }>;
}

export default async function ContentPage({ params }: ContentPageProps) {
  const { id } = await params;
  const item = await getContentItemById(parseInt(id, 10));

  if (!item) {
    notFound();
  }

  const renderByCategory = () => {
    // If item has video_id, show video layout (for videos and video-based series)
    if (item.video_id && item.video_id.trim().length > 0) {
      return <VideoContent item={item} />;
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
      {renderByCategory()}
    </div>
  );
}

// Video Content Layout
function VideoContent({ item }: { item: any }) {
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
              src={`https://www.youtube.com/embed/${videoId}`}
              title={item.title}
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
                צפה בסרטון במעלה
              </a>
            </div>
          </div>
        ) : isMeir ? (
          <div className="w-full h-96 flex items-center justify-center bg-gradient-to-br from-orange-100 to-orange-50">
            <div className="text-center">
              <p className="text-lg text-muted-foreground mb-4">
                סרטון זה מתארח באתר מכון מאיר
              </p>
              <a
                href={`http://meirtv.co.il/site/content_idx.asp?idx=${videoId.replace('Meir:', '').split('&')[0]}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
              >
                צפה בסרטון במכון מאיר
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
        <h1 className="text-3xl md:text-4xl font-bold mb-4">{item.title}</h1>

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
function stripVideoContent(content: string): string {
  if (!content) return '';

  return content
    // Remove Machon Meir tags
    .replace(/<machonMeeir(?:FR|IL|EN)?>(\d+)<\/machonMeeir(?:FR|IL|EN)?>/gi, '')
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
            {item.title}
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
              {item.title}
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
            {item.title}
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
