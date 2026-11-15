// T46.1/T47.5: initialize canonical topics without merging/deleting graph data.
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { TOPIC_NAMES } from './lib/question-bank';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
async function main() {
  for (const name of TOPIC_NAMES) {
    await prisma.topic.upsert({ where: { name }, create: { name }, update: {} });
  }
  const invalid = (await prisma.question.findMany({ select: { id: true, difficulty: true } }))
    .filter((q) => !Number.isFinite(q.difficulty) || q.difficulty < 0 || q.difficulty > 1);
  console.log('Canonical topics ready; existing topics, prerequisites, history and mastery preserved.');
  if (invalid.length) {
    console.error('Invalid legacy difficulties; inspect and correct from source (no automatic scale guessing):', invalid);
    process.exitCode = 1;
  }
}
main().catch((error) => { console.error(error); process.exitCode = 1; })
  .finally(async () => { await prisma.$disconnect(); await pool.end(); });
