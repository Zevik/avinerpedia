#!/usr/bin/env node
/**
 * Purge the cached public site after a script wrote to the DB (apply-enrichment,
 * apply-topic-taxonomy, check-dead-videos --apply, an import...). Admin saves do this
 * by themselves. Without it, changes show within a day (lib/cache.ts).
 *
 *   npm run revalidate                          # https://avinerpedia.vercel.app
 *   npm run revalidate -- http://localhost:3001 # another deployment
 *
 * Authenticates with SUPABASE_SERVICE_ROLE_KEY from .env.local (the server compares it
 * with its own copy; nothing else is done with it).
 */
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local', quiet: true });

const site = (process.argv[2] || process.env.NEXT_PUBLIC_SITE_URL || 'https://avinerpedia.vercel.app').replace(/\/$/, '');
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!key) {
  console.error('SUPABASE_SERVICE_ROLE_KEY is missing from .env.local');
  process.exit(1);
}

const res = await fetch(`${site}/api/revalidate`, { method: 'POST', headers: { Authorization: `Bearer ${key}` } });
console.log(`${site}: ${res.status} ${await res.text()}`);
// exitCode, not exit(): exiting while fetch's socket closes trips a libuv assertion on Windows.
process.exitCode = res.ok ? 0 : 1;
