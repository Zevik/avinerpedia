// Extracts taxonomy tables from the MediaWiki phpMyAdmin dump into JSON.
// Usage: node scripts/source/extract-mediawiki-dump.mjs [dump.sql] [outDir]
// Reads only the `shlomoavinernet_avinerpedia` database and only the tables below.
import fs from 'fs';
import path from 'path';
import readline from 'readline';

const DUMP = process.argv[2] || 'support/localhost.sql/localhost.sql';
const OUT = process.argv[3] || 'support/derived';
const DB = 'shlomoavinernet_avinerpedia';
const TABLES = new Set([
  'page', 'categorylinks', 'category', 'linktarget', 'templatelinks', 'redirect',
  'page_props', 'cargo__videos', 'cargo__videos__categories', 'cargo_pages',
]);

// Parses the VALUES part of an INSERT statement into arrays of JS values.
function parseValues(sql, start) {
  const rows = [];
  let i = start;
  const n = sql.length;
  while (i < n) {
    while (i < n && sql[i] !== '(') i++;
    if (i >= n) break;
    i++;
    const row = [];
    for (;;) {
      while (sql[i] === ' ' || sql[i] === '\n' || sql[i] === '\r') i++;
      const c = sql[i];
      if (c === "'") {
        let s = '';
        i++;
        for (;;) {
          const ch = sql[i];
          if (ch === '\\') {
            const e = sql[i + 1];
            s += e === 'n' ? '\n' : e === 'r' ? '\r' : e === 't' ? '\t' : e === '0' ? '\0' : e === 'Z' ? '\x1a' : e;
            i += 2;
          } else if (ch === "'") {
            if (sql[i + 1] === "'") { s += "'"; i += 2; } else { i++; break; }
          } else { s += ch; i++; }
        }
        row.push(s);
      } else if (c === '0' && sql[i + 1] === 'x') {
        let j = i + 2;
        while (/[0-9a-fA-F]/.test(sql[j])) j++;
        row.push(Buffer.from(sql.slice(i + 2, j), 'hex').toString('utf8'));
        i = j;
      } else {
        let j = i;
        while (sql[j] !== ',' && sql[j] !== ')') j++;
        const raw = sql.slice(i, j).trim();
        row.push(raw === 'NULL' ? null : raw === '' ? '' : isNaN(Number(raw)) ? raw : Number(raw));
        i = j;
      }
      while (sql[i] === ' ') i++;
      if (sql[i] === ',') { i++; continue; }
      if (sql[i] === ')') { i++; break; }
      throw new Error(`Unexpected char ${JSON.stringify(sql[i])} at ${i}`);
    }
    rows.push(row);
  }
  return rows;
}

const out = Object.fromEntries([...TABLES].map((t) => [t, []]));
let currentDb = null;
let stmt = null; // { table, cols, text }

const rl = readline.createInterface({ input: fs.createReadStream(DUMP, { encoding: 'utf8' }), crlfDelay: Infinity });
for await (const line of rl) {
  if (stmt) {
    stmt.text += '\n' + line;
    if (line.endsWith(');')) {
      const rows = parseValues(stmt.text, 0);
      for (const r of rows) out[stmt.table].push(Object.fromEntries(stmt.cols.map((c, k) => [c, r[k]])));
      stmt = null;
    }
    continue;
  }
  const use = line.match(/^USE `([^`]+)`;/);
  if (use) { currentDb = use[1]; continue; }
  if (currentDb !== DB) continue;
  const ins = line.match(/^INSERT INTO `([^`]+)` \(([^)]*)\) VALUES/);
  if (ins && TABLES.has(ins[1])) {
    stmt = { table: ins[1], cols: ins[2].split(',').map((c) => c.trim().replace(/`/g, '')), text: '' };
  }
}

fs.mkdirSync(OUT, { recursive: true });
for (const [t, rows] of Object.entries(out)) {
  fs.writeFileSync(path.join(OUT, `${t}.json`), JSON.stringify(rows));
  console.log(`${t}: ${rows.length} rows`);
}
