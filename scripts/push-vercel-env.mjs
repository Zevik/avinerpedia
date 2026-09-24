// Replaces the Supabase env vars in the Vercel project with the values from .env.local,
// then verifies with `vercel env ls` that every variable exists in every target.
// Usage (after `npx vercel login` and `npx vercel link --project avinerpedia`):
//   node scripts/push-vercel-env.mjs
import fs from 'fs';
import { spawnSync } from 'child_process';

// Secrets (sensitive) can't target Development on Vercel, so the service key skips it.
const VARS = [
  { key: 'NEXT_PUBLIC_SUPABASE_URL', targets: ['production', 'preview', 'development'], sensitive: false },
  { key: 'NEXT_PUBLIC_SUPABASE_ANON_KEY', targets: ['production', 'preview', 'development'], sensitive: false },
  { key: 'SUPABASE_SERVICE_ROLE_KEY', targets: ['production', 'preview'], sensitive: true },
];

const env = Object.fromEntries(
  fs
    .readFileSync('.env.local', 'utf8')
    .split(/\r?\n/)
    .map((line) => line.match(/^([A-Z0-9_]+)=(.*)$/))
    .filter(Boolean)
    .map((m) => [m[1], m[2].trim()]),
);

// Values go through stdin, never the command line, so a single command string is safe here.
function vercel(command, input) {
  return spawnSync(`npx vercel ${command}`, { input, encoding: 'utf8', shell: true });
}

for (const { key, targets, sensitive } of VARS) {
  if (!env[key]) {
    console.error(`Missing ${key} in .env.local`);
    process.exit(1);
  }
  for (const target of targets) {
    const flags = `--force --yes --non-interactive ${sensitive ? '--sensitive' : '--no-sensitive'}`;
    const res = vercel(`env add ${key} ${target} ${flags}`, env[key]);
    const output = `${res.stdout}\n${res.stderr}`.trim();
    console.log(`${res.status === 0 ? '·' : '✗'} ${key} → ${target}`);
    if (res.status !== 0) console.error(output);
  }
}

// Don't trust exit codes alone: confirm every variable is actually listed for every target.
const list = vercel('env ls');
const listing = `${list.stdout}\n${list.stderr}`;
const missing = [];
for (const { key, targets } of VARS) {
  for (const target of targets) {
    const found = listing
      .split(/\r?\n/)
      .some((line) => line.trim().startsWith(`${key} `) && line.toLowerCase().includes(target));
    if (!found) missing.push(`${key} → ${target}`);
  }
}

if (missing.length) {
  console.error(`\n✗ Missing after push (${missing.length}):\n  ${missing.join('\n  ')}`);
  console.error('\nFull `vercel env ls` output:\n' + listing);
  process.exit(1);
}
console.log('\n✓ Verified: all variables are set in Vercel. Redeploy to use them.');
