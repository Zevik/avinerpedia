// MediaWiki wikitext (support/avinerpedia.xml, via support/derived/xml_pages.json) ->
// the Markdown the site renders, in the same shape as the original MDX export:
//   {{שות|כותרת=X|שאלה=Q|תשובה=A}}  ->  **X** (once per run of equal titles), "ש: Q", "ת: A"
//   == H ==  -> ## H    '''b''' -> **b**    ''i'' -> *i*    [[page|label]] -> label
//   [url label] -> [label](url)    categories, {{ייבוא}} and __MAGIC__ words are dropped.
// Handles what the Q&A and article pages use; unknown templates are dropped and reported.

/** Split a template body on "|" outside nested {{ }} and [[ ]]. */
function splitTop(s) {
  const parts = [];
  let depth = 0, cur = '';
  for (let i = 0; i < s.length; i++) {
    const two = s.slice(i, i + 2);
    if (two === '{{' || two === '[[') { depth++; cur += two; i++; continue; }
    if ((two === '}}' || two === ']]') && depth > 0) { depth--; cur += two; i++; continue; }
    if (s[i] === '|' && depth === 0) { parts.push(cur); cur = ''; continue; }
    cur += s[i];
  }
  parts.push(cur);
  return parts;
}

/** Replace every top-level {{...}} with render(name, params); unbalanced braces stay as text. */
function expandTemplates(text, render) {
  let out = '', i = 0;
  while (i < text.length) {
    const start = text.indexOf('{{', i);
    if (start < 0) { out += text.slice(i); break; }
    out += text.slice(i, start);
    let depth = 0, j = start;
    for (; j < text.length; j++) {
      if (text.startsWith('{{', j)) { depth++; j++; }
      else if (text.startsWith('}}', j)) { depth--; j++; if (depth === 0) break; }
    }
    if (depth !== 0) { out += text.slice(start); break; }
    const [name, ...params] = splitTop(text.slice(start + 2, j - 1));
    out += render(name.trim(), params);
    i = j + 1;
  }
  return out;
}

const HEB = 'א-ת';

function inline(s) {
  return s
    .replace(/'''''(.+?)'''''/g, '***$1***')
    .replace(/'''(.+?)'''/g, '**$1**')
    .replace(new RegExp(`([${HEB}])''([${HEB}])`, 'g'), '$1"$2') // שו''ת: '' is a quote mark
    .replace(/''(.+?)''/g, '*$1*')
    .replace(/\[\[(?:[^|\]]*\|)?([^\]]+)\]\]/g, '$1')
    .replace(/\[(https?:\/\/[^\s\]]+)\s+([^\]]+)\]/g, '[$2]($1)')
    .replace(/\[(https?:\/\/[^\s\]]+)\]/g, '<$1>')
    // Links to the old wiki become site-relative: app/[...legacy] redirects them to the item.
    .replace(/\]\(https?:\/\/(?:www\.)?shlomo-aviner\.net\/index\.php\//g, '](/');
}

/**
 * @param {string} wikitext
 * @returns {{ markdown: string, unknownTemplates: string[] }}
 */
export function wikitextToMarkdown(wikitext) {
  const unknownTemplates = [];
  let lastQaTitle = null;

  const render = (name, params) => {
    if (name === '!') return '|';
    if (name === 'ייבוא') return '';
    if (name === 'שות') {
      const named = {};
      for (const p of params) {
        const eq = p.indexOf('=');
        if (eq > 0) named[p.slice(0, eq).trim()] = expandTemplates(p.slice(eq + 1), render).trim();
      }
      const title = named['כותרת'] || '';
      const heading = title && title !== lastQaTitle ? `'''${title}'''\n\n` : ''; // bolded by inline()
      lastQaTitle = title;
      return `\n\n${heading}ש: ${named['שאלה'] || ''}\n\nת: ${named['תשובה'] || ''}\n\n`;
    }
    unknownTemplates.push(name);
    return '';
  };

  let text = (wikitext || '').replace(/\r\n?/g, '\n')
    .replace(/\[\[\s*(קטגוריה|Category)\s*:[^\]]*\]\]/gi, '')
    .replace(/__[A-Z]+__/g, '');
  // A Q&A title repeats only within an unbroken run of templates.
  text = expandTemplates(text, (name, params) => {
    const out = render(name, params);
    if (name !== 'שות') lastQaTitle = null;
    return out;
  });
  // Block syntax first (a wiki "*" list vs. the "**" that inline() makes for bold), then inline.
  const lines = text.split('\n').map((line) => {
    const l = line.trim();
    const h = l.match(/^(={2,6})\s*(.+?)\s*\1$/);
    if (h) return `${'#'.repeat(h[1].length)} ${inline(h[2])}`;
    if (/^\*+/.test(l)) return '- ' + inline(l.replace(/^\*+\s*/, ''));
    if (/^#+/.test(l)) return '1. ' + inline(l.replace(/^#+\s*/, ''));
    return inline(l);
  });
  const markdown = lines
    // Some pages put the next question's bold title at the end of the previous answer.
    .map((l) => l.replace(/([.)!?:])\s+(\*\*[^*]+\*\*)$/, '$1\n\n$2'))
    .join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n';
  return { markdown, unknownTemplates };
}

/** The card/SEO summary, built exactly like scripts/import-from-wiki.ts. */
export function summaryFromMarkdown(markdown) {
  const summary = markdown
    .replace(/<[^>]*>/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[#*`_~[\]]/g, '')
    .replace(/\s+/g, ' ')
    .substring(0, 200)
    .trim();
  return summary.length > 3 ? summary : null;
}
