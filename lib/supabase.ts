import { createClient } from '@supabase/supabase-js';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Use placeholder values during build time if env vars are not set
const url = supabaseUrl || 'https://placeholder.supabase.co';
const key = supabaseAnonKey || 'placeholder-key';

// In the browser, use the cookie-based auth-helpers client so requests carry the
// signed-in admin's session (set by /admin/login) and pass the is_admin() RLS
// write policies. On the server, reads stay anonymous.
export const supabase =
  typeof window === 'undefined'
    ? createClient(url, key)
    : createClientComponentClient({ supabaseUrl: url, supabaseKey: key });
