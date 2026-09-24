/**
 * Display-time cleanup of imported content_md (the stored text is left as imported).
 * The MDX export left markup that rendered as gibberish or broke paragraphs:
 * - "\r\r\n" line ends: Markdown reads CR + CRLF as a blank line, so every hard-wrapped line
 *   became its own paragraph ("…הלכות יסודי" / "התורה ה ט.") — ~4,000 items.
 * - Wiki category links as HTML (`<a href="Category:X" class="wikilink">`) and as inline code
 *   ("`[[קטגוריה:X]]`"), usually in a row at the end; the topic chips already show topics.
 * - Other wiki links with a relative href (broken under /content/); they now go through the
 *   legacy redirects ("/Title" → the item).
 * - Leftover wiki syntax: '''bold''', "== heading ==", [[link|text]].
 */

const CATEGORY = /^:?\s*(?:Category|קטגוריה|קטוגריה)\s*:/i;
const WIKILINK = /<a href="([^"]*)" class="wikilink"\s+title="[^"]*">(?:<code>)?([\s\S]*?)(?:<\/code>)?<\/a>/g;

const decodeEntities = (s: string) =>
  s.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');

/** "זוגיות_ומשפחה_(שו&quot;ת)" -> "/%D7%96…" (resolved by app/[...legacy]). */
function legacyHref(href: string): string {
  const title = decodeEntities(href).replace(/^:/, '').trim().replace(/ /g, '_');
  return '/' + encodeURIComponent(title).replace(/%2F/g, '/');
}

/** A line Markdown treats as a block of its own: heading, list, quote, HTML, table, code. */
const BLOCK_LINE = /^\s*(?:[#>|<`]|==|[-*+]\s|\d+[.)]\s)/;
/** A line that opens a new Q&A turn or a bold title. */
const STARTS_TURN = /^\s*(?:ש:|ת:|שאלה:|תשובה:|\*\*|''')/;
/** A line that ends a sentence (or a bold title), so the next line starts a new paragraph. */
const SENTENCE_END = /[.?!:;)\]"'״׳…*]\s*$/;

/**
 * Items stored with "\r\r\n" rendered every line end as a paragraph break. Keep that look for
 * lines that really end (punctuation, headings, lists, a new Q&A turn), but join the lines the
 * export hard-wrapped mid-sentence, and never break inside an HTML tag.
 */
function unwrapCrCrLf(s: string): string {
  return s
    .split(/\r\r\n(?:[ \t]*\r\r\n)+/)
    .map((para) =>
      para.split('\r\r\n').reduce((out, line) => {
        if (!out) return line;
        if (/<[^>]*$/.test(out)) return out + '\n' + line; // inside a tag: <a href=…\ntitle=…>
        const prev = out.slice(out.lastIndexOf('\n') + 1);
        const join = prev.trim() && line.trim() && !BLOCK_LINE.test(prev) && !BLOCK_LINE.test(line)
          && !STARTS_TURN.test(line) && !SENTENCE_END.test(prev);
        return out + (join ? ' ' : '\n\n') + line;
      }, ''),
    )
    .join('\n\n');
}

export function cleanContent(md: string | null | undefined): string {
  let s = md || '';
  if (s.includes('\r\r\n')) s = unwrapCrCrLf(s);
  s = s.replace(/\r/g, '');

  // Inline-code category leftovers: "`[[קטגוריה:X]]`", "`]]קטגוריה: X]]`".
  s = s.replace(/`[^`\n]*(?:Category|קטגוריה|קטוגריה)[^`\n]*`/gi, '');
  // A last paragraph made only of wiki links is the page's tag row (7651: תנ"ך · אקטואליה · מוסר).
  const paragraphs = s.split(/\n[ \t]*\n/);
  const last = paragraphs[paragraphs.length - 1];
  if (paragraphs.length > 1 && WIKILINK.test(last) && last.replace(WIKILINK, '').replace(/[`\s ·|,•-]/g, '') === '') {
    paragraphs.pop();
    s = paragraphs.join('\n\n');
  }
  WIKILINK.lastIndex = 0;
  // Wiki links rendered as HTML.
  s = s.replace(WIKILINK, (_, href: string, text: string) => {
    const target = decodeEntities(href);
    if (CATEGORY.test(target)) return '';
    const label = text.replace(/<\/?code>/g, '');
    if (/^https?:\/\//.test(target)) return `<a href="${href}" target="_blank" rel="noopener noreferrer">${label}</a>`;
    return `<a href="${legacyHref(href)}">${label}</a>`;
  });
  // Empty code spans left between removed links ("` `"), and a heading's closing "`==`".
  s = s.replace(/`[\s ]*`/g, '').replace(/`[\s ]*=+[\s ]*`/g, '');

  // Leftover wiki syntax.
  s = s
    .replace(/\[\[(?:[^|\]]*\|)?([^\]]+)\]\]/g, (m, text: string) => (CATEGORY.test(text) ? '' : text))
    .replace(/'''(.+?)'''/g, '**$1**')
    .replace(/'''/g, '')
    .replace(/^[ \t]*={2,}[ \t]*$/gm, '') // a heading's closing "==" left on its own line
    .replace(/^[ \t]*[-*][ \t]*$/gm, '') // an empty list item (renders as a lone bullet)
    // "== X ==", or "== X" whose closing "==" was split off to the next line.
    .replace(/^(={2,6})[ \t]*([^=\s].*?)[ \t]*=*[ \t]*$/gm, (_, eq: string, text: string) => `${'#'.repeat(eq.length)} ${text}`);

  // Paragraphs emptied by the removals.
  return s
    .split(/\n[ \t]*\n/)
    .filter((p) => p.trim() !== '')
    .join('\n\n')
    .trim();
}
