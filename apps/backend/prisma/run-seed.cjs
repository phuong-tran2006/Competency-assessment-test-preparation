// Keep generation ahead of ts-node imports so a clean checkout works too.
require('dotenv').config({ quiet: true });
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const production = process.argv.includes('--production');
if (process.argv.slice(2).some((arg) => arg !== '--production')) {
  console.error('Dùng: npm run seed hoặc npm run seed:production');
  process.exit(1);
}
if (!process.env.DATABASE_URL || (!production && process.env.NODE_ENV === 'production')) {
  console.error('Cần DATABASE_URL; môi trường production phải dùng npm run seed:production.');
  process.exit(1);
}
const root = path.resolve(__dirname, '..');
function run(script, args) {
  const result = spawnSync(process.execPath, [require.resolve(script), ...args], {
    cwd: root, env: process.env, stdio: 'inherit',
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status || 1);
}
if (!production) run('prisma/build/index.js', ['migrate', 'deploy']);
run('prisma/build/index.js', ['generate']);
run('ts-node/dist/bin.js', [production ? 'prisma/seed_production.ts' : 'prisma/seed.ts']);
