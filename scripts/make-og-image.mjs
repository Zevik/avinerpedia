// Renders the default Open Graph / WhatsApp share image to public/og-default.jpg (1200x630).
// JPEG keeps it well under ~300KB, above which WhatsApp may skip the preview image.
// Usage: node scripts/make-og-image.mjs   (needs network for the Heebo web font)
import { chromium } from '@playwright/test';

const html = `<!doctype html>
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
  h1 { font-size: 150px; font-weight: 900; line-height: 1; letter-spacing: -2px; }
  h2 { font-size: 58px; font-weight: 700; margin-top: 24px; color: #e0e7ff; }
  .types { font-size: 36px; margin-top: 44px; color: #c7d2fe; }
  .url { position: absolute; bottom: 44px; left: 96px; z-index: 1; font-size: 28px; color: #a5b4fc; direction: ltr; }
</style>
</head>
<body>
  <div class="content">
    <div class="badge">ארכיון התורה של הרב שלמה אבינר שליט"א</div>
    <h1>אבינרפדיה</h1>
    <h2>כל שיעורי הרב שלמה אבינר</h2>
    <div class="types">סרטונים · מאמרים · שאלות ותשובות · סדרות לימוד</div>
  </div>
  <div class="url">avinerpedia.vercel.app</div>
</body>
</html>`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
await page.setContent(html, { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);
await page.screenshot({ path: 'public/og-default.jpg', type: 'jpeg', quality: 88 });
await browser.close();
console.log('wrote public/og-default.jpg');
