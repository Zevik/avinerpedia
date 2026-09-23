// Replaces the Supabase env vars in the Vercel project with the values from .env.local.
// Usage (after `npx vercel login` and `npx vercel link --project avinerpedia`):
//   node scripts/push-vercel-env.mjs
import fs from 'fs';
import { execSync } from 'child_process';

const KEYS = ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY'];
const TARGETS = ['production', 'preview', 'development'];

const env = Object.fromEntries(
  fs
    .readFileSync('.env.local', 'utf8')
    .split(/\r?\n/)
    .map((line) => line.match(/^([A-Z0-9_]+)=(.*)$/))
    .filter(Boolean)
    .map((m) => [m[1], m[2].trim()]),
);

for (const key of KEYS) {
  if (!env[key]) {
    console.error(`Missing ${key} in .env.local`);
    process.exit(1);
  }
  for (const target of TARGETS) {
    try {
      execSync(`npx vercel env rm ${key} ${target} -y`, { stdio: 'ignore' });
    } catch {
      // Not set for this target yet.
    }
    execSync(`npx vercel env add ${key} ${target}`, { input: env[key], stdio: ['pipe', 'ignore', 'inherit'] });
    console.log(`✓ ${key} → ${target}`);
  }
}
console.log('\nDone. Redeploy for the new values to take effect: npx vercel --prod');
