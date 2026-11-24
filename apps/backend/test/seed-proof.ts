/** Full CLI proof: blank DB, rerun, FK/indexes, production and backup restore. */
import 'dotenv/config';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import * as bcrypt from 'bcrypt';
import { Pool } from 'pg';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { seedConfig } from '../prisma/lib/seed-config';
import { seedSystem, DEMO_ATTEMPT_IDS } from '../prisma/lib/seed-system';
import { restoreDatabase } from '../prisma/lib/postgres-tools';
import { auditAssessment } from '../prisma/lib/audit-assessment';
import { SnapshotQuestion } from '../src/attempts/question-snapshot';
import { INITIAL_RATING, updateRating } from '../src/mastery/elo';

const exec = promisify(execFile);
const root = path.resolve(__dirname, '..');
const source = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;
if (!source) throw new Error('Cần TEST_DATABASE_URL hoặc DATABASE_URL có quyền tạo DB tạm');
const suffix = randomUUID().replaceAll('-', '').slice(0, 12);
const artifacts = path.join(root, 'test-results', 'seed', suffix);
fs.mkdirSync(artifacts, { recursive: true });
const admin = new Pool({ connectionString: source, connectionTimeoutMillis: 10000 });
const databases = new Set<string>();
const pools: Pool[] = [];
const clients: PrismaClient[] = [];
const identifier = (name: string) => '"' + name.replaceAll('"', '""') + '"';
function url(name: string) {
  const target = new URL(source!); target.pathname = '/' + name; return target.toString();
}
async function database(kind: 'demo' | 'production' | 'restore') {
  const name = 'seed_' + kind + '_' + suffix;
  await admin.query('CREATE DATABASE ' + identifier(name));
  databases.add(name);
  const pool = new Pool({ connectionString: url(name) });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
  pools.push(pool); clients.push(prisma);
  return { pool, prisma, connection: url(name) };
}
async function run(connection: string, production = false, extra: NodeJS.ProcessEnv = {}) {
  if (!process.env.npm_execpath) throw new Error('Chạy proof qua npm run test:seed:integration');
  return exec(process.execPath, [process.env.npm_execpath, 'run', production ? 'seed:production' : 'seed'], {
    cwd: path.resolve(root, '../..'), env: { ...process.env, NODE_ENV: production ? 'production' : 'test', DATABASE_URL: connection, ...extra },
    timeout: 240000, maxBuffer: 4 * 1024 * 1024,
  });
}
async function fingerprints(pool: Pool) {
  const tables = await pool.query<{ tablename: string }>("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename");
  const result: Record<string, { count: number; hash: string }> = {};
  for (const { tablename } of tables.rows) {
    result[tablename] = (await pool.query('SELECT count(*)::int AS count, md5(COALESCE(jsonb_agg(to_jsonb(r) ORDER BY to_jsonb(r)::text)::text, \'[]\')) AS hash FROM ' + identifier(tablename) + ' r')).rows[0];
  }
  return result;
}

async function main() {
  const demo = await database('demo');
  await run(demo.connection);
  const roles = await demo.prisma.user.findMany({ orderBy: { role: 'asc' } });
  assert.deepEqual(roles.map((user) => user.role), ['STUDENT', 'INSTRUCTOR', 'ADMIN']);
  for (const user of roles) assert.ok(await bcrypt.compare('admin123', user.passwordHash));
  assert.equal(await demo.prisma.topic.count(), 5);
  assert.equal(await demo.prisma.question.count(), 492);
  assert.equal(await demo.prisma.exam.count(), 3);
  assert.equal(await demo.prisma.examAnswer.count(), 360);
  const course = await demo.prisma.course.findUniqueOrThrow({ where: { id: 'course-1' }, include: { instructor: true } });
  assert.equal(course.status, 'PUBLISHED'); assert.equal(course.instructor.role, 'INSTRUCTOR');
  assert.equal(await demo.prisma.enrollment.count(), 1);
  assert.equal(await demo.prisma.lessonProgress.count({ where: { isCompleted: true } }), 1);
  const attempts = await demo.prisma.examAttempt.findMany({ orderBy: { id: 'asc' }, include: { answers: { orderBy: { id: 'asc' } } } });
  assert.deepEqual(attempts.map((attempt) => attempt.score), [60, 72, 84]);
  const ratings = new Map<string, { masteryScore: number; attempts: number }>();
  for (const attempt of attempts) {
    assert.ok(attempt.masteryUpdatedAt);
    for (const answer of attempt.answers) {
      if (!answer.selectedOptionIds.length) continue;
      const question = answer.questionSnapshot as unknown as SnapshotQuestion;
      const row = ratings.get(question.topicId) ?? { masteryScore: INITIAL_RATING, attempts: 0 };
      row.masteryScore = updateRating(row.masteryScore, question.difficulty, answer.isCorrect); row.attempts += 1;
      ratings.set(question.topicId, row);
    }
  }
  const masteries = await demo.prisma.topicMastery.findMany({ orderBy: { topicId: 'asc' } });
  assert.ok(masteries.length >= 4);
  for (const mastery of masteries) assert.deepEqual({ masteryScore: mastery.masteryScore, attempts: mastery.attempts }, ratings.get(mastery.topicId));
  const links = await demo.prisma.examQuestion.findMany({ orderBy: [{ examId: 'asc' }, { order: 'asc' }] });
  const options = await demo.prisma.questionOption.findMany({ orderBy: { id: 'asc' } });
  await run(demo.connection);
  assert.equal(await demo.prisma.user.count(), 3);
  assert.deepEqual(await demo.prisma.examAttempt.findMany({ orderBy: { id: 'asc' }, include: { answers: { orderBy: { id: 'asc' } } } }), attempts);
  assert.deepEqual(await demo.prisma.topicMastery.findMany({ orderBy: { topicId: 'asc' } }), masteries);
  assert.deepEqual(await demo.prisma.examQuestion.findMany({ orderBy: [{ examId: 'asc' }, { order: 'asc' }] }), links);
  assert.deepEqual(await demo.prisma.questionOption.findMany({ orderBy: { id: 'asc' } }), options);
  assert.deepEqual(await demo.prisma.user.findMany({ orderBy: { role: 'asc' } }), roles);
  assert.equal(await demo.prisma.material.count(), 1);
  assert.deepEqual((await auditAssessment(demo.prisma)).issues, []);
  console.log('PASS CLI demo twice: 3 roles, 492 questions, 3x120 exams, history, grading and Elo');

  const beforeConflict = await fingerprints(demo.pool);
  const conflicting = seedConfig('demo');
  conflicting.accounts[0].email = 'learner@vact.com';
  await assert.rejects(() => seedSystem(demo.prisma, conflicting), /role\/status/);
  assert.deepEqual(await fingerprints(demo.pool), beforeConflict);
  await assert.rejects(() => demo.prisma.examAttempt.delete({ where: { id: DEMO_ATTEMPT_IDS[0] } }), { code: 'P2003' });
  await assert.rejects(() => demo.prisma.exam.delete({ where: { id: 'vact-exam-2024' } }), { code: 'P2003' });
  const indexes = (await demo.pool.query<{ indexname: string }>("SELECT indexname FROM pg_indexes WHERE schemaname='public'")).rows.map((row) => row.indexname);
  for (const name of ['exam_attempts_userId_status_submittedAt_idx', 'exam_answers_attemptId_id_idx', 'exam_attempts_examId_idx']) assert.ok(indexes.includes(name), name);
  const plans = await demo.prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe('SET LOCAL enable_seqscan = off');
    const history = await tx.$queryRaw`EXPLAIN (FORMAT JSON) SELECT "id" FROM "exam_attempts" WHERE "userId" = ${roles[0].id} AND "status" = 'SUBMITTED' ORDER BY "submittedAt" DESC LIMIT 20`;
    const answers = await tx.$queryRaw`EXPLAIN (FORMAT JSON) SELECT "id" FROM "exam_answers" WHERE "attemptId" = ${DEMO_ATTEMPT_IDS[0]} ORDER BY "id"`;
    return { history, answers };
  });
  assert.match(JSON.stringify(plans.history), /exam_attempts_userId_status_submittedAt_idx/);
  assert.match(JSON.stringify(plans.answers), /exam_answers_attemptId_id_idx/);
  await exec(process.execPath, [require.resolve('prisma/build/index.js'), 'migrate', 'diff', '--from-config-datasource', '--to-schema', 'prisma/schema.prisma', '--exit-code'], {
    cwd: root, env: { ...process.env, DATABASE_URL: demo.connection },
  });
  console.log('PASS rollback, FK Restrict, answer/history index plans and migration/schema parity');

  const production = await database('production');
  const productionEnv = { SEED_BACKUP_DIR: path.join(artifacts, 'backups') } as NodeJS.ProcessEnv;
  for (const role of ['ADMIN', 'INSTRUCTOR', 'STUDENT']) {
    productionEnv['SEED_' + role + '_EMAIL'] = role.toLowerCase() + '@release.example.test';
    productionEnv['SEED_' + role + '_PASSWORD'] = randomUUID();
  }
  await assert.rejects(() => run(production.connection, true, { ...productionEnv, SEED_ADMIN_PASSWORD: '' }));
  assert.deepEqual(await fingerprints(production.pool), {});
  await run(production.connection, true, productionEnv);
  assert.equal(await production.prisma.user.count(), 3);
  assert.equal(await production.prisma.user.count({ where: { email: { endsWith: '@vact.com' } } }), 0);
  assert.equal(await production.prisma.course.count(), 0);
  assert.equal(await production.prisma.examAttempt.count(), 0);
  assert.equal(await production.prisma.topicMastery.count(), 0);
  const productionAccounts = await production.prisma.user.findMany({ orderBy: { email: 'asc' } });
  await run(production.connection, true, { ...productionEnv, SEED_ADMIN_PASSWORD: randomUUID() });
  assert.deepEqual(await production.prisma.user.findMany({ orderBy: { email: 'asc' } }), productionAccounts);
  const productionState = await fingerprints(production.pool);
  await assert.rejects(() => run(production.connection, true, { ...productionEnv, PG_BIN: path.join(artifacts, 'missing-pg-bin') }));
  assert.deepEqual(await fingerprints(production.pool), productionState);
  const reports = fs.readdirSync(productionEnv.SEED_BACKUP_DIR!).filter((name) => name.endsWith('-report.json'));
  assert.equal(reports.length, 2);
  const report = JSON.parse(fs.readFileSync(path.join(productionEnv.SEED_BACKUP_DIR!, reports.sort().at(-1)!), 'utf8'));
  assert.deepEqual(report.audit.issues, []);
  assert.deepEqual(report.audit.annual.map((exam: { questions: number }) => exam.questions), [120, 120, 120]);
  for (const backup of Object.values(report.backups) as { path: string; sha256: string }[]) {
    assert.equal(createHash('sha256').update(fs.readFileSync(backup.path)).digest('hex'), backup.sha256);
  }
  const restored = await database('restore');
  await restoreDatabase(restored.connection, report.backups.ready.path);
  assert.deepEqual(await fingerprints(restored.pool), productionState);
  await assert.rejects(() => restoreDatabase(restored.connection, report.backups.ready.path), /database kiểm thử rỗng/);
  await assert.rejects(() => run(demo.connection, false, { NODE_ENV: 'production' }));
  const proof = { status: 'PASS', demo: await auditAssessment(demo.prisma), production: report.audit,
    restoredTables: Object.keys(productionState).length, plans };
  fs.writeFileSync(path.join(artifacts, 'report.json'), JSON.stringify(proof, null, 2));
  console.log('PASS production CLI twice, passwords preserved, failed backup aborts, archive hashes and full restore');
  console.log('Seed INTEGRATION PASS. Report: ' + path.relative(root, path.join(artifacts, 'report.json')));
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(async () => {
  for (const client of clients) await client.$disconnect();
  for (const pool of pools) await pool.end();
  for (const name of databases) {
    assert.match(name, /^seed_(demo|production|restore)_[a-f0-9]{12}$/);
    await admin.query('DROP DATABASE ' + identifier(name) + ' WITH (FORCE)');
  }
  await admin.end();
});
