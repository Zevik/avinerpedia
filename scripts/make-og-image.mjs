// Renders the Open Graph / WhatsApp share images to public/ (1200x630): the site default
// (home page and anything without its own image) and one per menu section, so sharing a
// hub page shows what it is rather than a specific item. Used via lib/seo.ts (OG_IMAGES).
// JPEG keeps them well under ~300KB, above which WhatsApp may skip the preview image.
// Usage: node scripts/make-og-image.mjs [domain]   (needs network for the Heebo web font)
//   domain: shown at the bottom (default avinerpedia.vercel.app; re-run after a domain switch)
import { chromium } from '@playwright/test';

const domain = process.argv[2] || 'avinerpedia.vercel.app';
const SITE_BADGE = 'ארכיון התורה של הרב שלמה אבינר שליט"א';
const SECTION_BADGE = 'אבינרפדיה · ארכיון התורה של הרב שלמה אבינר';

const IMAGES = [
  { file: 'og-default.jpg', badge: SITE_BADGE, h1: 'אבינרפדיה', h2: 'כל שיעורי הרב שלמה אבינר', line: 'סרטונים · מאמרים · שאלות ותשובות · סדרות לימוד' },
  { file: 'og-videos.jpg', badge: SECTION_BADGE, h1: 'סרטונים', h2: 'שיעורי וידאו של הרב שלמה אבינר', line: 'אלפי שיעורים בכל נושאי התורה · סינון לפי נושא' },
  { file: 'og-articles.jpg', badge: SECTION_BADGE, h1: 'מאמרים', h2: 'מאמרי הרב שלמה אבינר', line: 'אמונה · הלכה · חינוך · זוגיות ומשפחה · מדינת ישראל' },
  { file: 'og-qa.jpg', badge: SECTION_BADGE, h1: 'שו"ת הלכה', h2: 'שאלות ותשובות עם הרב שלמה אבינר', line: 'אורח חיים · יורה דעה · אבן העזר · חושן משפט' },
  { file: 'og-series.jpg', badge: SECTION_BADGE, h1: 'סדרות לימוד', h2: 'שיעורי הרב שלמה אבינר לפי הסדר', line: 'אורות · אורות התחיה · עין איה · כוזרי ועוד' },
  { file: 'og-topics.jpg', badge: SECTION_BADGE, h1: 'נושאים', h2: 'כל התכנים לפי נושא', line: 'הלכה · אמונה · חגים ומועדים · תפילה · ועוד' },
  { file: 'og-french.jpg', badge: SECTION_BADGE, h1: 'Cours en français', h1Size: 118, h1Dir: 'ltr', h2: 'שיעורי הרב שלמה אבינר בצרפתית', line: 'Emouna · Erets Israël · La Paracha de la semaine' },
];

const escape = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
const html = ({ badge, h1, h1Size = 150, h1Dir = 'rtl', h2, line }) => `<!doctype html>
<html lang="he" dir="rtl">
<head>
<meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Heebo:wght@400;700;900&display=block" rel="stylesheet">
<style>
  * { margin: 0; box-sizing: border-box; }
  body {
    width: 1200px; height: 630px; overflow: hidden;
    font-family: 'Heebo', sans-serif; color: #fff;
    background: linear-gradient(135deg, #1e3a8a 0%, #312e81 55%, #0f172a 100%);
    display: flex; flex-direction: column; justify-content: center; padding: 0 96px;
    position: relative;
  }
  body::after {
    content: ''; position: absolute; inset: 0;
    background-image: radial-gradient(rgba(255,255,255,0.08) 1.5px, transparent 1.5px);
    background-size: 28px 28px;
  }
  .content { position: relative; z-index: 1; }
  .badge {
    display: inline-block; font-size: 30px; font-weight: 700; color: #bfdbfe;
    border: 2px solid rgba(191,219,254,0.5); border-radius: 999px; padding: 6px 28px; margin-bottom: 36px;
  }
  h1 { font-size: ${h1Size}px; font-weight: 900; line-height: 1; letter-spacing: -2px; direction: ${h1Dir}; text-align: right; }
  h2 { font-size: 58px; font-weight: 700; margin-top: 24px; color: #e0e7ff; }
  .types { font-size: 36px; margin-top: 44px; color: #c7d2fe; }
  .url { position: absolute; bottom: 44px; left: 96px; z-index: 1; font-size: 28px; color: #a5b4fc; direction: ltr; }
</style>
</head>
<body>
  <div class="content">
    <div class="badge">${escape(badge)}</div>
    <h1>${escape(h1)}</h1>
    <h2>${escape(h2)}</h2>
    <div class="types">${escape(line)}</div>
  </div>
  <div class="url">${escape(domain)}</div>
</body>
</html>`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
for (const image of IMAGES) {
  await page.setContent(html(image), { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: `public/${image.file}`, type: 'jpeg', quality: 88 });
  console.log(`wrote public/${image.file}`);
}
await browser.close();
