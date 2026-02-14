import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { getVimeoId } from '@/lib/video';

interface ContentRendererProps {
  content: string;
  className?: string;
}

export async function ContentRenderer({ content, className = '' }: ContentRendererProps) {
  // Extract YouTube video IDs from <youtube> tags
  const youtubeMatches = content.match(/<youtube>([^<]+)<\/youtube>/g);
  const youtubeIds = youtubeMatches?.map(match => {
    const id = match.replace(/<\/?youtube>/g, '').trim();
    return id;
  }) || [];

  // 1. Resolve Machon Meir tags to clean embeds first
  // We need to do this asynchronously
  let processedContent = content;
  const meirMatches = Array.from(content.matchAll(/<machonMeeir(?:FR|IL|EN)?>(\d+).*?<\/machonMeeir(?:FR|IL|EN)?>/gi));

  for (const match of meirMatches) {
    const [fullTag, id] = match;
    const vimeoId = await getVimeoId(id);
    const embedUrl = vimeoId
      ? `https://player.vimeo.com/video/${vimeoId}`
      : `https://meirtv.com/shiurim/shiur-${id}/fvp/`;

    const replacement = `<div class="relative w-full mb-6" style="padding-bottom: 56.25%">
        <iframe
          class="absolute top-0 left-0 w-full h-full rounded-lg"
          src="${embedUrl}"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowfullscreen
        ></iframe>
      </div>`;

    processedContent = processedContent.replace(fullTag, replacement);
  }

  // 2. Clean and fix markdown syntax issues
  let cleanedContent = processedContent
    // Remove <youtube> tags - we'll render them separately
    .replace(/<youtube>[^<]+<\/youtube>/g, '')
    // Remove footer text from video content
    .replace(/• למאגר מלא ומסודר.*?https:\/\/twitter\.com\/RavAviner__/gs, '')
    // Stage 1: Fix patterns with trailing punctuation: * text*' -> **text**
    .replace(/\* ([^*\n]+)\*['|"]/g, '**$1**')
    // Stage 2: Fix * *text:** -> **text:**
    .replace(/\* \*([^*]+):\*\*/g, '**$1:**')
    // Stage 3: Fix * *text** (at end or before space/newline) -> **text**
    .replace(/\* \*([^*]+)\*\*(?=\s|$)/g, '**$1**')
    // Stage 4: Fix * text:* -> **text:**
    .replace(/\* ([^*\n]+):\*/g, '**$1:**')
    // Stage 5: Fix * text* (standalone) -> **text**
    .replace(/\* ([^*\n]+)\*(?=\s|$)/g, '**$1**')
    // Stage 6: Remove standalone * * lines
    .replace(/^\* \*\s*$/gm, '')
    // Stage 7: Remove orphaned asterisks at start of lines
    .replace(/^\*\s*$/gm, '')
    // Stage 8: Bold Q&A markers
    .replace(/^(שאלה:)/gm, '**שאלה:**')
    .replace(/^(תשובה:)/gm, '**תשובה:**')
    .replace(/^(ש:)/gm, '**ש:**')
    .replace(/^(ת:)/gm, '**ת:**')
    // Stage 9: Only remove single asterisks that are NOT part of **.
    // We use a negative lookahead/lookbehind to avoid touching ** or ***.
    .replace(/(?<!\*)\*(?!\*)/g, '');

  return (
    <div className={`prose prose-lg max-w-none ${className}`}>
      {/* Render YouTube videos if found */}
      {youtubeIds.length > 0 && (
        <div className="space-y-6 mb-8">
          {youtubeIds.map((videoId, index) => (
            <div key={index} className="relative w-full rounded-lg overflow-hidden shadow-lg" style={{ paddingBottom: '56.25%' }}>
              <iframe
                className="absolute top-0 left-0 w-full h-full"
                src={`https://www.youtube.com/embed/${videoId}`}
                title={`YouTube video ${index + 1}`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          ))}
        </div>
      )}

      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
        components={{
          // Customize heading styles
          h1: ({ node, ...props }) => (
            <h1 className="text-3xl font-bold mt-8 mb-4" {...props} />
          ),
          h2: ({ node, ...props }) => (
            <h2 className="text-2xl font-bold mt-6 mb-3" {...props} />
          ),
          h3: ({ node, ...props }) => (
            <h3 className="text-xl font-semibold mt-4 mb-2" {...props} />
          ),
          // Customize list styles
          ul: ({ node, ...props }) => (
            <ul className="list-disc list-inside space-y-2 my-4" {...props} />
          ),
          ol: ({ node, ...props }) => (
            <ol className="list-decimal list-inside space-y-2 my-4" {...props} />
          ),
          // Customize paragraph
          p: ({ node, ...props }) => (
            <p className="leading-relaxed mb-4" {...props} />
          ),
          // Customize blockquote
          blockquote: ({ node, ...props }) => (
            <blockquote className="border-r-4 border-primary/30 pr-4 italic my-4 text-muted-foreground" {...props} />
          ),
          // Customize links
          a: ({ node, ...props }) => (
            <a className="text-primary hover:underline" {...props} />
          ),
          // Customize bold/strong text
          strong: ({ node, ...props }) => (
            <strong className="font-bold text-gray-900" {...props} />
          ),
          // Customize italic/emphasis text
          em: ({ node, ...props }) => (
            <em className="italic text-gray-800" {...props} />
          ),
        }}
      >
        {cleanedContent}
      </ReactMarkdown>
    </div>
  );
}
