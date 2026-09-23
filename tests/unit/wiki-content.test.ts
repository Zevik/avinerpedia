import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

// Guards the source data that scripts/import-from-wiki.ts reads.
const wikiDir = path.join(process.cwd(), 'content/wiki');
const files = fs.readdirSync(wikiDir).filter((f) => f.endsWith('.mdx'));

describe('content/wiki', () => {
  it('contains the wiki export', () => {
    expect(files.length).toBeGreaterThan(7000);
  });

  it('every file has frontmatter that gray-matter can parse', () => {
    const failures = files.filter((f) => {
      try {
        matter(fs.readFileSync(path.join(wikiDir, f), 'utf8'));
        return false;
      } catch {
        return true;
      }
    });
    expect(failures).toEqual([]);
  });

  it('every file has a title', () => {
    const missing = files.filter((f) => !matter(fs.readFileSync(path.join(wikiDir, f), 'utf8')).data.title);
    expect(missing).toEqual([]);
  });
});
