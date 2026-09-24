import { describe, it, expect } from 'vitest';
import { cardSummary, displayTitle } from '../../lib/utils';

describe('displayTitle', () => {
  it('drops the "(מאמר)" suffix, keeps other parentheses', () => {
    expect(displayTitle('גבעת האולפנה היא שלנו (מאמר)')).toBe('גבעת האולפנה היא שלנו');
    expect(displayTitle('פרשת וירא: מעלת הכנסת אורחים (מאמר))')).toBe('פרשת וירא: מעלת הכנסת אורחים');
    expect(displayTitle('כפירה (שו"ת)')).toBe('כפירה (שו"ת)');
    expect(displayTitle('תפילה בישיבה (וידאו)')).toBe('תפילה בישיבה');
    expect(displayTitle('תפילה(וידאו)')).toBe('תפילה');
    expect(displayTitle('תפילה במניין - למי יש עדיפות? (וידאו קצר)')).toBe('תפילה במניין - למי יש עדיפות? (וידאו קצר)');
    expect(displayTitle(null)).toBe('');
  });
});
import { cardThumbnail } from '../../lib/video';

describe('cardSummary', () => {
  it('drops Machon Meir embed leftovers', () => {
    expect(cardSummary('8519&catid=4072')).toBeNull();
    expect(cardSummary('idx=8485&catid=4072')).toBeNull();
    expect(cardSummary('סרטון הרב שלמה אבינר מתוך אתר מכון מאיר 8622&catid=3732')).toBeNull();
  });

  it('cleans a leading YouTube id and wiki markup', () => {
    expect(cardSummary('muxLiXV5LvY שיעור שהועבר בתאריך: כט\' חשוון')).toBe('שיעור שהועבר בתאריך: כט\' חשוון');
    expect(cardSummary('== לברוח ולחזור == \\מ"ראש יהודי"\\ יש תמונה')).toBe('לברוח ולחזור מ"ראש יהודי" יש תמונה');
  });

  it('keeps normal summaries and drops empty ones', () => {
    expect(cardSummary('איני יודע מי הראשון שהמציא שאלה זו')).toBe('איני יודע מי הראשון שהמציא שאלה זו');
    expect(cardSummary(null)).toBeNull();
    expect(cardSummary('   ')).toBeNull();
  });
});

describe('cardThumbnail', () => {
  it('YouTube, Machon Meir (via Vimeo), Maale', () => {
    expect(cardThumbnail('G6qejC6Dx-U')).toBe('https://img.youtube.com/vi/G6qejC6Dx-U/mqdefault.jpg');
    expect(cardThumbnail('Meir:8519')).toBe('https://vumbnail.com/232304444.jpg');
    expect(cardThumbnail('Meir:8519&cat_id=4072')).toBe('https://vumbnail.com/232304444.jpg');
    expect(cardThumbnail('Maale:blog/x')).toBeNull();
    expect(cardThumbnail(null)).toBeNull();
  });
});
