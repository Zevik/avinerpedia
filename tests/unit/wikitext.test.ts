import { describe, it, expect } from 'vitest';
import { wikitextToMarkdown, summaryFromMarkdown } from '../../scripts/source/wikitext-to-markdown.mjs';

const md = (w: string) => wikitextToMarkdown(w).markdown;

describe('wikitextToMarkdown', () => {
  it('expands שות templates, showing a repeated title once', () => {
    const out = md(
      '[[קטגוריה:שו"ת]] {{ייבוא|input}}\n' +
        '{{שות|כותרת=חברות|שאלה=מותר?|תשובה=לא.}}\n' +
        '{{שות|כותרת=חברות|שאלה=ובעבודה?|תשובה=גם לא.}}\n' +
        '{{שות|כותרת=פגיעה|שאלה=מה לעשות?|תשובה=להתקשר.}}',
    );
    expect(out).toBe('**חברות**\n\nש: מותר?\n\nת: לא.\n\nש: ובעבודה?\n\nת: גם לא.\n\n**פגיעה**\n\nש: מה לעשות?\n\nת: להתקשר.\n');
    expect(out).not.toContain('קטגוריה');
  });

  it('keeps pipes inside links and {{!}} within template parameters', () => {
    const out = md('{{שות|כותרת=א|שאלה=ראו [[דף|כאן]]?|תשובה=כן {{!}} לא}}');
    expect(out).toContain('ש: ראו כאן?');
    expect(out).toContain('ת: כן | לא');
  });

  it('converts headings, bold, lists and links; a bold line is not a list item', () => {
    const out = md("== כותרת ==\n'''שאלה:''' משהו\n* פריט\n[https://example.com אתר] ו[[עמוד]]");
    expect(out).toBe('## כותרת\n**שאלה:** משהו\n- פריט\n[אתר](https://example.com) ועמוד\n');
  });

  it('moves a bold title glued to the end of an answer to its own paragraph', () => {
    expect(md("ת: כן. '''הנושא הבא'''")).toBe('ת: כן.\n\n**הנושא הבא**\n');
  });

  it('makes links to the old wiki site-relative', () => {
    expect(md('[http://shlomo-aviner.net/index.php/%D7%90 כאן]')).toBe('[כאן](/%D7%90)\n');
  });

  it("reads '' between Hebrew letters as a quote mark, not italics", () => {
    expect(md("שו''ת ביה''ל")).toBe('שו"ת ביה"ל\n');
  });

  it('reports unknown templates', () => {
    expect(wikitextToMarkdown('{{משהו|x}} טקסט').unknownTemplates).toEqual(['משהו']);
  });
});

describe('summaryFromMarkdown', () => {
  it('strips formatting and cuts at 200 characters', () => {
    expect(summaryFromMarkdown('**כותרת**\n\nש: שאלה?')).toBe('כותרת ש: שאלה?');
    expect(summaryFromMarkdown('א'.repeat(300))!.length).toBe(200);
  });
});
