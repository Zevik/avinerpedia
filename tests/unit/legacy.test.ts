import { describe, it, expect } from 'vitest';
import { legacyTitleKey, safeDecode } from '../../lib/legacy-title';
import { resolveLegacy } from '../../lib/legacy';
import redirects from '../../lib/legacy-redirects.json';

const params = (q = '') => new URLSearchParams(q);
const firstTitleTo = (prefix: string) =>
  Object.entries(redirects.titles).find(([, path]) => path.startsWith(prefix))!;

describe('legacyTitleKey', () => {
  it('turns URL underscores into spaces and collapses whitespace', () => {
    expect(legacyTitleKey('שם_השיעור__הזה ')).toBe('שם השיעור הזה');
  });

  it('upper-cases the first letter like MediaWiki', () => {
    expect(legacyTitleKey('elections')).toBe('Elections');
  });

  it("decodes entities and treats '' as \"", () => {
    expect(legacyTitleKey('צה&quot;ל')).toBe('צה"ל');
    expect(legacyTitleKey("צה''ל")).toBe('צה"ל');
  });

  it('accepts English and Hebrew category prefixes', () => {
    expect(legacyTitleKey('Category:אמונה')).toBe('קטגוריה:אמונה');
    expect(legacyTitleKey('קטגוריה: אמונה')).toBe('קטגוריה:אמונה');
  });
});

describe('safeDecode', () => {
  it('decodes percent-encoded Hebrew and keeps "+" literal', () => {
    expect(safeDecode('%D7%A9%D7%9C%D7%95%D7%9D')).toBe('שלום');
    expect(safeDecode('1+1%3D1')).toBe('1+1=1');
  });

  it('survives malformed escapes', () => {
    expect(safeDecode('%E0%A4%A')).toBe('%E0%A4%A');
  });
});

describe('resolveLegacy', () => {
  it('maps a clean /Title_With_Underscores URL to its content page with 301', () => {
    const [title, path] = firstTitleTo('/content/');
    const url = '/' + encodeURIComponent(title.replace(/ /g, '_'));
    expect(resolveLegacy(url, params())).toEqual({ status: 301, location: path });
  });

  it('maps /index.php?title= and /w/index.php?title=', () => {
    const [title, path] = firstTitleTo('/content/');
    const q = params(`title=${encodeURIComponent(title.replace(/ /g, '_'))}`);
    expect(resolveLegacy('/index.php', q)).toEqual({ status: 301, location: path });
    expect(resolveLegacy('/w/index.php', q)).toEqual({ status: 301, location: path });
  });

  it('maps /index.php?curid=', () => {
    const [curid, path] = Object.entries(redirects.curids).find(([, p]) => p.startsWith('/content/'))!;
    expect(resolveLegacy('/index.php', params(`curid=${curid}`))).toEqual({ status: 301, location: path });
  });

  it('never 410s a mapped title, whatever its prefix', () => {
    for (const [title, path] of Object.entries(redirects.titles)) {
      expect(resolveLegacy('/index.php', params(`title=${encodeURIComponent(title)}`))).toEqual({ status: 301, location: path });
    }
  });

  it('sends the old home page to /', () => {
    expect(resolveLegacy('/' + encodeURIComponent('עמוד_ראשי'), params())).toEqual({ status: 301, location: '/' });
    expect(resolveLegacy('/index.php', params())).toEqual({ status: 301, location: '/' });
  });

  it('maps category pages to topic pages', () => {
    const [title, path] = firstTitleTo('/topics/');
    expect(title.startsWith('קטגוריה:')).toBe(true);
    expect(resolveLegacy('/' + encodeURIComponent(title.replace(/ /g, '_')), params())).toEqual({ status: 301, location: path });
  });

  it('falls back to a 302 search for unknown titles', () => {
    expect(resolveLegacy('/' + encodeURIComponent('דף_שלא_קיים_בכלל'), params())).toEqual({
      status: 302,
      location: `/library?q=${encodeURIComponent('דף שלא קיים בכלל')}`,
    });
  });

  it('searches for the target title when a redirect points to a deleted page', () => {
    const [title, target] = Object.entries(redirects.searches)[0];
    expect(resolveLegacy('/' + encodeURIComponent(title), params())).toEqual({
      status: 302,
      location: `/library?q=${encodeURIComponent(target)}`,
    });
  });

  it('410s the wiki namespaces (special pages, users, talk, templates...), Hebrew and English', () => {
    for (const title of ['מיוחד:שינויים_אחרונים', 'Special:RecentChanges', 'special:Search', 'משתמש:Admin', 'User_talk:Bot',
      'שיחה:דף_כלשהו', 'שיחת_קטגוריה:אמונה', 'תבנית:שות', 'Template:Video', 'קובץ:תמונה.jpg', 'שיעורי_הרב_שלמה_אבינר:אודות']) {
      expect(resolveLegacy('/' + encodeURIComponent(title), params()), title).toEqual({ status: 410 });
      expect(resolveLegacy('/index.php', params(`title=${encodeURIComponent(title)}`)), title).toEqual({ status: 410 });
    }
  });

  it('410s wiki tools (edit, diff, raw, search) even for known titles', () => {
    const [title] = firstTitleTo('/content/');
    const t = encodeURIComponent(title.replace(/ /g, '_'));
    for (const q of [`title=${t}&action=edit`, `title=${t}&diff=12&oldid=11`, `title=${t}&action=raw`, 'search=אמונה&title=מיוחד:חיפוש']) {
      expect(resolveLegacy('/index.php', params(q)), q).toEqual({ status: 410 });
    }
    expect(resolveLegacy('/' + t, params('action=edit'))).toEqual({ status: 410 });
  });

  it('sends history, old revisions and print views of a known title to its page, else 410', () => {
    const [title, path] = firstTitleTo('/content/');
    const t = encodeURIComponent(title.replace(/ /g, '_'));
    for (const q of ['action=history', 'oldid=1234', 'printable=yes', 'action=view']) {
      expect(resolveLegacy('/index.php', params(`title=${t}&${q}`)), q).toEqual({ status: 301, location: path });
      expect(resolveLegacy('/' + t, params(q)), q).toEqual({ status: 301, location: path });
      expect(resolveLegacy('/index.php', params(`title=${encodeURIComponent('דף_שלא_קיים')}&${q}`)), q).toEqual({ status: 410 });
    }
    expect(resolveLegacy('/index.php', params('oldid=1234'))).toEqual({ status: 410 });
    expect(resolveLegacy('/index.php', params('curid=999999999'))).toEqual({ status: 410 });
  });

  it('maps /index.php/Title and the old sitemap files', () => {
    const [title, path] = firstTitleTo('/content/');
    expect(resolveLegacy('/index.php/' + encodeURIComponent(title.replace(/ /g, '_')), params())).toEqual({ status: 301, location: path });
    expect(resolveLegacy('/sitemap/sitemap-index-shlomo-aviner.xml', params())).toEqual({ status: 301, location: '/sitemap.xml' });
  });

  it('returns 404 for asset-like paths', () => {
    expect(resolveLegacy('/favicon.ico', params())).toEqual({ status: 404 });
    expect(resolveLegacy('/wp-login.php', params())).toEqual({ status: 404 });
  });

  it('resolves every mapped legacy title correctly and fast', () => {
    const entries = Object.entries(redirects.titles);
    const start = performance.now();
    for (const [title, path] of entries) {
      expect(resolveLegacy('/' + encodeURIComponent(title.replace(/ /g, '_')), params())).toEqual({ status: 301, location: path });
    }
    const perLookupMs = (performance.now() - start) / entries.length;
    expect(entries.length).toBeGreaterThan(8000);
    expect(perLookupMs).toBeLessThan(1);
  });

  it('never captures the app namespaces', () => {
    expect(resolveLegacy('/api/admin/categories', params())).toEqual({ status: 404 });
    expect(resolveLegacy('/admin/unknown', params())).toEqual({ status: 404 });
    expect(resolveLegacy('/_next/something', params())).toEqual({ status: 404 });
  });
});
