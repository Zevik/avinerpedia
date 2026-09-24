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
      location: `/search?q=${encodeURIComponent('דף שלא קיים בכלל')}`,
    });
  });

  it('searches for the target title when a redirect points to a deleted page', () => {
    const [title, target] = Object.entries(redirects.searches)[0];
    expect(resolveLegacy('/' + encodeURIComponent(title), params())).toEqual({
      status: 302,
      location: `/search?q=${encodeURIComponent(target)}`,
    });
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
