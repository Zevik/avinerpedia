#!/usr/bin/env node
/**
 * Google Search Console API for shlomo-aviner.net, read-only.
 * Key: GSC_SERVICE_ACCOUNT_KEY in .env.local (base64 of the service account JSON).
 *
 *   node scripts/gsc.mjs sites                    # checks access to the property
 *   node scripts/gsc.mjs sitemaps                 # submitted sitemaps and their status
 *   node scripts/gsc.mjs query [days] [dimension] # top rows (query|page|date|device|country), default 28 page
 *   node scripts/gsc.mjs inspect <url>...         # URL Inspection: index status, canonical, last crawl
 */
import { createSign } from 'node:crypto';
import { readFileSync } from 'node:fs';

// Only this property. The same service account also sees other sites; never query them from here.
const SITE = 'sc-domain:shlomo-aviner.net';

function loadKey() {
  let b64 = process.env.GSC_SERVICE_ACCOUNT_KEY;
  if (!b64) {
    const m = readFileSync(new URL('../.env.local', import.meta.url), 'utf8').match(/^GSC_SERVICE_ACCOUNT_KEY=(.+)$/m);
    b64 = m?.[1].trim();
  }
  if (!b64) throw new Error('GSC_SERVICE_ACCOUNT_KEY is not set');
  return JSON.parse(Buffer.from(b64, 'base64').toString('utf8'));
}

async function token() {
  const key = loadKey();
  const now = Math.floor(Date.now() / 1000);
  const enc = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
  const unsigned = `${enc({ alg: 'RS256', typ: 'JWT' })}.${enc({
    iss: key.client_email,
    scope: 'https://www.googleapis.com/auth/webmasters.readonly',
    aud: key.token_uri,
    iat: now,
    exp: now + 3600,
  })}`;
  const sig = createSign('RSA-SHA256').update(unsigned).sign(key.private_key, 'base64url');
  const res = await fetch(key.token_uri, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${unsigned}.${sig}` }),
  });
  const json = await res.json();
  if (!json.access_token) throw new Error(`token: ${JSON.stringify(json)}`);
  return json.access_token;
}

async function api(tok, path, body) {
  const res = await fetch(`https://${path}`, {
    method: body ? 'POST' : 'GET',
    headers: { authorization: `Bearer ${tok}`, ...(body && { 'content-type': 'application/json' }) },
    body: body && JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`${res.status} ${path}: ${JSON.stringify(json.error ?? json)}`);
  return json;
}

const site = encodeURIComponent(SITE);
const WM = 'www.googleapis.com/webmasters/v3';
const [cmd = 'sites', ...args] = process.argv.slice(2);
const tok = await token();

if (cmd === 'sites') {
  const entry = ((await api(tok, `${WM}/sites`)).siteEntry ?? []).filter((e) => e.siteUrl === SITE);
  console.log(JSON.stringify(entry, null, 2));
} else if (cmd === 'sitemaps') {
  console.log(JSON.stringify((await api(tok, `${WM}/sites/${site}/sitemaps`)).sitemap ?? [], null, 2));
} else if (cmd === 'query') {
  const days = Number(args[0] || 28);
  const dim = args[1] || 'page';
  const day = (d) => new Date(Date.now() - d * 86400e3).toISOString().slice(0, 10);
  const r = await api(tok, `${WM}/sites/${site}/searchAnalytics/query`, {
    startDate: day(days + 2),
    endDate: day(2),
    dimensions: [dim],
    rowLimit: Number(args[2] || 50),
  });
  for (const row of r.rows ?? [])
    console.log(`${row.clicks}\t${row.impressions}\t${row.position.toFixed(1)}\t${row.keys.join(' | ')}`);
  if (!r.rows) console.log('(no rows)');
} else if (cmd === 'inspect') {
  for (const url of args) {
    if (!/^https:\/\/(www\.)?shlomo-aviner\.net\//.test(url)) throw new Error(`not a shlomo-aviner.net URL: ${url}`);
    const r = await api(tok, 'searchconsole.googleapis.com/v1/urlInspection/index:inspect', {
      inspectionUrl: url,
      siteUrl: SITE,
    });
    const s = r.inspectionResult?.indexStatusResult ?? {};
    console.log(url);
    for (const k of ['verdict', 'coverageState', 'robotsTxtState', 'indexingState', 'pageFetchState', 'lastCrawlTime', 'crawledAs', 'googleCanonical', 'userCanonical'])
      if (s[k]) console.log(`  ${k}: ${s[k]}`);
  }
} else {
  console.error(`unknown command: ${cmd}`);
  process.exit(1);
}
