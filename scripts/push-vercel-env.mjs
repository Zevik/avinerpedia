// Replaces the Supabase env vars in the Vercel project with the values from .env.local.
// Usage (after `npx vercel login` and `npx vercel link --project avinerpedia`):
//   node scripts/push-vercel-env.mjs
// Then verify with `npx vercel env ls` and redeploy.
import fs from 'fs';
import { spawnSync } from 'child_process';

const KEYS = ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY'];
// Preview needs an explicit (empty = all branches) git-branch argument, or the CLI prompts for one.
const TARGETS = [
  ['production'],
  ['preview', ''],
  ['development'],
];

const env = Object.fromEntries(
  fs
    .readFileSync('.env.local', 'utf8')
    .split(/\r?\n/)
    .map((line) => line.match(/^([A-Z0-9_]+)=(.*)$/))
    .filter(Boolean)
    .map((m) => [m[1], m[2].trim()]),
);

function vercel(args, input) {
  // With shell: true (needed for npx on Windows) an empty argument must be quoted to survive.
  const quoted = process.platform === 'win32' ? args.map((a) => (a === '' ? '""' : a)) : args;
  return spawnSync('npx', ['vercel', ...quoted], {
    input,
    encoding: 'utf8',
    shell: process.platform === 'win32',
  });
}

const failures = [];
for (const key of KEYS) {
  if (!env[key]) {
    console.error(`Missing ${key} in .env.local`);
    process.exit(1);
  }
  for (const [target, ...extra] of TARGETS) {
    // Remove the old value; "not found" is fine.
    vercel(['env', 'rm', key, target, ...extra, '--yes']);

    const res = vercel(['env', 'add', key, target, ...extra], env[key]);
    if (res.status === 0) {
      console.log(`✓ ${key} → ${target}`);
    } else {
      console.error(`✗ ${key} → ${target}\n${(res.stderr || res.stdout || '').trim()}\n`);
      failures.push(`${key} → ${target}`);
    }
  }
}

if (failures.length) {
  console.error(`\n${failures.length} failed:\n  ${failures.join('\n  ')}`);
  process.exit(1);
}
console.log('\nAll set. Check with `npx vercel env ls`, then redeploy.');
