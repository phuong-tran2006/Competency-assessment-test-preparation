import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { auditAssessment } from './lib/audit-assessment';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
auditAssessment(prisma)
  .then((report) => {
    console.log(JSON.stringify(report, null, 2));
    if (report.issues.length) process.exitCode = 1;
  })
  .catch((error) => { console.error(error); process.exitCode = 1; })
  .finally(async () => { await prisma.$disconnect(); await pool.end(); });
