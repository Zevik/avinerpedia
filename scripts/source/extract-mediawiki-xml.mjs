// Extracts page title, namespace, id, latest timestamp and wikitext from the MediaWiki XML export.
// Usage: node scripts/source/extract-mediawiki-xml.mjs [export.xml] [outDir]
import fs from 'fs';
import path from 'path';

const XML = process.argv[2] || 'support/avinerpedia.xml';
const OUT = process.argv[3] || 'support/derived';

const unescape = (s) =>
  s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&amp;/g, '&');
const tag = (block, name) => {
  const m = block.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`));
  return m ? unescape(m[1]) : null;
};

const xml = fs.readFileSync(XML, 'utf8');
const pages = [];
for (const m of xml.matchAll(/<page>([\s\S]*?)<\/page>/g)) {
  const block = m[1];
  const redirect = block.match(/<redirect title="([^"]*)"/);
  pages.push({
    id: Number(tag(block, 'id')),
    ns: Number(tag(block, 'ns')),
    title: tag(block, 'title'),
    redirect: redirect ? unescape(redirect[1]) : null,
    timestamp: tag(block, 'timestamp'),
    text: tag(block, 'text') ?? '',
  });
}

fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, 'xml_pages.json'), JSON.stringify(pages));
console.log(`pages: ${pages.length}`);
