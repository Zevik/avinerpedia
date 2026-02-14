#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Read SQL from file
const sqlPath = path.join(__dirname, 'supabase_schema.sql');
const sql = fs.readFileSync(sqlPath, 'utf8');

// Split into executable statements
const statements = sql
  .split(';')
  .map(s => s.trim())
  .filter(s => s.length > 0 && !s.startsWith('--'));

console.log('📝 SQL Schema Statements Generated:');
console.log('=======================================\n');

statements.forEach((stmt, i) => {
  const preview = stmt.substring(0, 60) + (stmt.length > 60 ? '...' : '');
  console.log(`${i + 1}. ${preview}`);
});

console.log('\n=======================================');
console.log(`✅ Total: ${statements.length} statements to execute\n`);

console.log('📚 Instructions to Execute in Supabase Dashboard:');
console.log('1. Go to: https://app.supabase.com/project/gmxnfgbillsvscqouhke/sql');
console.log('2. Create a new query');
console.log('3. Paste the content of scripts/supabase_schema.sql');
console.log('4. Click "Run" button');
console.log('5. Verify all tables are created\n');

console.log('⏭️  After schema is created, run:');
console.log('   npx tsx scripts/migrate-to-supabase.ts\n');
