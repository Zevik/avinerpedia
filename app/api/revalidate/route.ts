import { timingSafeEqual } from 'crypto';
import { revalidatePath, revalidateTag } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { CONTENT_CACHE_TAG } from '@/lib/cache';

/**
 * POST /api/revalidate — purges the cached public site (all pages and DB reads).
 * Called by the admin screens after every save (lib/revalidate.ts, with the admin's
 * session token) and by `npm run revalidate` after scripts write to the DB (with the
 * service role key). Anyone else gets 401/403.
 */
export async function POST(request: NextRequest) {
  const token = request.headers.get('authorization')?.match(/^Bearer (.+)$/)?.[1];
  if (!token) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (!isServiceKey(token) && !(await isAdminToken(token))) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  revalidateTag(CONTENT_CACHE_TAG);
  revalidatePath('/', 'layout');
  return NextResponse.json({ revalidated: true });
}

function isServiceKey(token: string) {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey || token.length !== serviceKey.length) return false;
  return timingSafeEqual(Buffer.from(token), Buffer.from(serviceKey));
}

/** The token is a signed-in user's session and that user is in admin_users. Not cached. */
async function isAdminToken(token: string) {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false },
  });
  const { data, error } = await supabase.rpc('is_admin');
  return !error && data === true;
}
