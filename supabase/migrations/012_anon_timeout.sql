-- 012: give public (anon) reads 8 s instead of Supabase's default 3 s.
--
-- Why (2026-10-11): after 011 every library search runs in 0.2-0.4 s once its data is in
-- memory, but the first call for a new search term reads from disk on the free tier and takes
-- ~3.5 s ("שלמה אבינר": 3.4 s cold -> 0.3 s warm), so it hit anon's 3 s statement_timeout and
-- the page answered 500. ~60 such requests in the 12 hours after 011, all searches (crawlers
-- that ignore robots.txt walking a results page's topic links). 8 s is what the authenticated
-- role already has; successful results are then cached for a day by the app's Data Cache.
--
-- Idempotent. Undo: alter role anon set statement_timeout = '3s'; notify pgrst, 'reload config';

alter role anon set statement_timeout = '8s';

-- PostgREST reads role settings when it loads its config.
notify pgrst, 'reload config';

-- Expect: 8s
select rolname, rolconfig from pg_roles where rolname = 'anon';
