-- 008: keep-alive for the Supabase free tier (projects pause after 7 days without activity).
-- cron-job.org calls POST /rest/v1/rpc/keep_alive_ping twice a day with the anon key;
-- the function does a real write, so the project always counts as active.
-- The table has RLS on and no policies: it is reachable only through the function.
-- Idempotent.

create table if not exists public.keep_alive (
  id integer primary key default 1 check (id = 1),
  last_ping timestamptz not null default now(),
  ping_count bigint not null default 0
);
alter table public.keep_alive enable row level security;
revoke all on table public.keep_alive from anon, authenticated;

create or replace function public.keep_alive_ping()
returns jsonb
language sql
security definer
set search_path = ''
as $$
  insert into public.keep_alive as k (id, last_ping, ping_count)
  values (1, now(), 1)
  on conflict (id) do update
    set last_ping = now(), ping_count = k.ping_count + 1
  returning jsonb_build_object('last_ping', k.last_ping, 'ping_count', k.ping_count);
$$;

revoke all on function public.keep_alive_ping() from public;
grant execute on function public.keep_alive_ping() to anon, authenticated;
