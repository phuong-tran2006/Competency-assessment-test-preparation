import 'dotenv/config';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { seedConfig } from './lib/seed-config';
import { seedSystem } from './lib/seed-system';
import { readBanks, readCatalog } from './lib/question-bank';
import { auditAssessment } from './lib/audit-assessment';
import { backupDatabase } from './lib/postgres-tools';

async function main() {
  const config = seedConfig('production');
  const connection = process.env.DATABASE_URL;
  if (!connection) throw new Error('Cần DATABASE_URL trỏ tới production');
  readBanks(); readCatalog();
  const directory = path.resolve(process.env.SEED_BACKUP_DIR ?? 'backups');
  const stamp = new Date().toISOString().replace(/[:.]/g, '-') + '-' + randomUUID().slice(0, 8);
  // A failing backup aborts the run before any migration or data mutation.
  const before = await backupDatabase(connection, path.join(directory, stamp + '-before.dump'));
  console.log('Backup trước thay đổi: ' + before);
  execFileSync(process.execPath, [require.resolve('prisma/build/index.js'), 'migrate', 'deploy'], {
    cwd: path.resolve(__dirname, '..'), env: process.env, stdio: 'inherit',
  });
  const pool = new Pool({ connectionString: connection });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
  try {
    const seed = await seedSystem(prisma, config);
    const audit = await auditAssessment(prisma);
    console.log(JSON.stringify({ seed, audit }, null, 2));
    if (audit.issues.length) throw new Error('Audit thất bại: chưa sẵn sàng go-live');
    const after = await backupDatabase(connection, path.join(directory, stamp + '-ready.dump'));
    const file = async (name: string) => {
      const hash = createHash('sha256');
      for await (const chunk of fs.createReadStream(name)) hash.update(chunk);
      return { path: name, bytes: fs.statSync(name).size, sha256: hash.digest('hex') };
    };
    const target = new URL(connection);
    const report = path.join(directory, stamp + '-report.json');
    fs.writeFileSync(report, JSON.stringify({
      status: 'PASS', createdAt: new Date().toISOString(),
      target: { host: target.hostname, port: target.port || '5432', database: decodeURIComponent(target.pathname.slice(1)) },
      seed, audit, backups: { before: await file(before), ready: await file(after) },
    }, null, 2), { flag: 'wx', mode: 0o600 });
    console.log('Seed production và backup cuối thành công. Báo cáo: ' + report);
  } finally { await prisma.$disconnect(); await pool.end(); }
}

main().catch((error) => { console.error(error.message); process.exitCode = 1; });
