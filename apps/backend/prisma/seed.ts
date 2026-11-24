import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { seedConfig } from './lib/seed-config';
import { seedSystem } from './lib/seed-system';
import { auditAssessment } from './lib/audit-assessment';

async function main() {
  const config = seedConfig('demo');
  if (!process.env.DATABASE_URL) throw new Error('Cần DATABASE_URL');
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
  try {
    console.log(JSON.stringify(await seedSystem(prisma, config), null, 2));
    const audit = await auditAssessment(prisma);
    console.log(JSON.stringify(audit, null, 2));
    if (audit.issues.length) throw new Error('Audit sau seed thất bại');
    console.log('Demo sẵn sàng: admin/instructor/learner @vact.com, mật khẩu mặc định admin123 (chỉ tài khoản mới).');
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((error) => { console.error(error.message); process.exitCode = 1; });
