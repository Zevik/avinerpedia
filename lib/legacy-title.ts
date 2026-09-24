/**
 * Title normalization for legacy MediaWiki URLs, shared by the redirect route
 * (lib/legacy.ts) and the mapping generator (scripts/source/build-legacy-redirects.ts)
 * so a title normalizes identically at build time and at request time.
 */

const decodeEntities = (s: string) => {
  for (let prev = ''; prev !== s; ) {
    prev = s;
    s = s.replace(/&quot;/g, '"').replace(/&#0?39;|&#x27;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
  }
  return s;
};

const CATEGORY = 'קטגוריה:';

/**
 * Canonical form of a wiki title as it appears in a URL or in the XML export:
 * underscores -> spaces, entities decoded, '' -> ", whitespace collapsed, English
 * "Category:" -> "קטגוריה:", first letter upper-cased (MediaWiki titles are
 * first-letter case-insensitive).
 */
export function legacyTitleKey(title: string): string {
  const t = decodeEntities(title.normalize('NFC'))
    .replace(/_/g, ' ')
    .replace(/''/g, '"')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^(category|קטגוריה)\s*:\s*/i, CATEGORY);
  const isCategory = t.startsWith(CATEGORY);
  const body = isCategory ? t.slice(CATEGORY.length) : t;
  const cased = body.charAt(0).toUpperCase() + body.slice(1);
  return isCategory ? CATEGORY + cased : cased;
}

/**
 * Decodes a percent-encoded path, tolerating malformed escapes. "+" stays literal:
 * in a path it is a real character (e.g. the title "1+1=1").
 */
export function safeDecode(s: string): string {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}
