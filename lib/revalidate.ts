import { supabase } from './supabase';

/**
 * After an admin write: purge the cached public site so the change shows immediately
 * (app/api/revalidate checks that the session belongs to an admin). Browser only.
 * A failure only delays the change until the cache expires (a day), so it doesn't throw.
 */
export async function refreshPublicSite() {
  if (typeof window === 'undefined') return;
  try {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) return;
    const res = await fetch('/api/revalidate', { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) console.warn('refreshPublicSite: revalidate failed', res.status);
  } catch (err) {
    console.warn('refreshPublicSite:', err);
  }
}
