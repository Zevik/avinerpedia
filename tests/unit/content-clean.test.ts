import { describe, it, expect } from 'vitest';
import { cleanContent } from '../../lib/content-clean';

describe('cleanContent', () => {
  it('joins lines hard-wrapped mid-sentence, keeps real line ends as paragraphs (CR CR LF items)', () => {
    expect(cleanContent('ת: הלכות יסודי\r\r\nהתורה ה ט.\r\r\n\r\r\nש: עוד')).toBe('ת: הלכות יסודי התורה ה ט.\n\nש: עוד');
    // A question line and its answer line, a heading, a list: still separate.
    expect(cleanContent('ש: מה הדין?\r\r\nת: מותר.')).toBe('ש: מה הדין?\n\nת: מותר.');
    expect(cleanContent('## כותרת\r\r\nטקסט')).toBe('## כותרת\n\nטקסט');
    expect(cleanContent('- א\r\r\n- ב')).toBe('- א\n\n- ב');
    expect(cleanContent('שורה בלי נקודה\r\r\nהמשך המשפט.\r\r\nמשפט חדש')).toBe('שורה בלי נקודה המשך המשפט.\n\nמשפט חדש');
  });

  it('leaves CRLF-only items rendering as before (soft line breaks)', () => {
    expect(cleanContent('שורה א\r\nשורה ב')).toBe('שורה א\nשורה ב');
  });

  it('removes a lone "==" line and empty list items, keeps horizontal rules', () => {
    expect(cleanContent('טקסט\n==\nעוד')).toBe('טקסט\n\nעוד');
    expect(cleanContent('טקסט\n\n- \n\nנלקח משאילת לשמה')).toBe('טקסט\n\nנלקח משאילת לשמה');
    expect(cleanContent('א\n\n---\n\nב')).toBe('א\n\n---\n\nב');
  });

  it('makes a heading whose closing "==" was split to the next line (item 3783)', () => {
    expect(cleanContent('== לברוח ולחזור\r\r\n==\r\r\n\\מ"ראש יהודי"\\ יש תמונה')).toBe('## לברוח ולחזור\n\n\\מ"ראש יהודי"\\ יש תמונה');
    expect(cleanContent('== לברוח ולחזור\r\r\n\r\r\n`==`\r\r\n\r\r\nטקסט')).toBe('## לברוח ולחזור\n\nטקסט');
  });

  it('drops the trailing row of category links (item 7651)', () => {
    const md =
      'שיעור שהועבר בתאריך: כב תמוז תשע"ב\r\r\n\r\r\n` `<a href="תנ&quot;ך" class="wikilink"\r\r\ntitle="תנ&quot;ך"><code>תנ"ך</code></a>` `' +
      '<a href="Category:מוסר" class="wikilink" title="Category:מוסר"><code>מוסר</code></a>` `';
    expect(cleanContent(md)).toBe('שיעור שהועבר בתאריך: כב תמוז תשע"ב');
  });

  it('keeps a last paragraph that has text besides links', () => {
    expect(cleanContent('א\n\nראו גם: <a href="תפילה" class="wikilink" title="תפילה">תפילה</a>')).toBe(
      'א\n\nראו גם: <a href="/%D7%AA%D7%A4%D7%99%D7%9C%D7%94">תפילה</a>',
    );
  });

  it('removes category links and inline-code category leftovers', () => {
    expect(cleanContent('טקסט\n\n<a href="Category:עבודת_ה&#39;" class="wikilink"\ntitle="Category:עבודת ה&#39;">Category:עבודת ה\'</a>')).toBe('טקסט');
    expect(cleanContent('טקסט `   [[קטגוריה: תלמידי חכמים (מאמרים)]]`')).toBe('טקסט');
  });

  it('points other wiki links at the legacy redirects, keeps external ones', () => {
    expect(cleanContent('ראו <a href="זוגיות_ומשפחה_(שו&quot;ת)" class="wikilink" title="x">כאן</a>')).toBe(
      'ראו <a href="/%D7%96%D7%95%D7%92%D7%99%D7%95%D7%AA_%D7%95%D7%9E%D7%A9%D7%A4%D7%97%D7%94_(%D7%A9%D7%95%22%D7%AA)">כאן</a>',
    );
    expect(cleanContent('<a href="http://example.com/a" class="wikilink"\ntitle="http://example.com/a">http://example.com/a</a>')).toBe(
      '<a href="http://example.com/a" target="_blank" rel="noopener noreferrer">http://example.com/a</a>',
    );
  });

  it('converts leftover wiki bold, headings and links', () => {
    expect(cleanContent("'''שאלה:''' מה?")).toBe('**שאלה:** מה?');
    expect(cleanContent("תשובה:''' הם קרוצים")).toBe('תשובה: הם קרוצים');
    expect(cleanContent('== סיכום דבריו = הקשבה ואיזון (א) ==')).toBe('## סיכום דבריו = הקשבה ואיזון (א)');
    expect(cleanContent('ראו [[הלכות שבת|שבת]] ו[[תפילה]]')).toBe('ראו שבת ותפילה');
  });

  it('leaves clean content alone', () => {
    const md = '## כותרת\n\n**ש:** שאלה?\n\n<iframe src="https://www.youtube.com/embed/abcdefghijk"></iframe>';
    expect(cleanContent(md)).toBe(md);
  });
});
