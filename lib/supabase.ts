import { createClient } from '@supabase/supabase-js';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { CONTENT_CACHE_SECONDS, CONTENT_CACHE_TAG } from './cache';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Use placeholder values during build time if env vars are not set
const url = supabaseUrl || 'https://placeholder.supabase.co';
const key = supabaseAnonKey || 'placeholder-key';

// Server reads go through Next's Data Cache: the content changes only every few days, and a
// flood of page views should not reach the database. Admin saves purge it via /api/revalidate
// (lib/revalidate.ts); after scripts that write to the DB, run `npm run revalidate`.
const cachedFetch: typeof fetch = (input, init) =>
  fetch(input, { ...init, next: { revalidate: CONTENT_CACHE_SECONDS, tags: [CONTENT_CACHE_TAG] } });

// In the browser, use the cookie-based auth-helpers client so requests carry the
// signed-in admin's session (set by /admin/login) and pass the is_admin() RLS
// write policies. On the server, reads stay anonymous (and cached).
export const supabase =
  typeof window === 'undefined'
    ? createClient(url, key, { global: { fetch: cachedFetch } })
    : createClientComponentClient({ supabaseUrl: url, supabaseKey: key });
