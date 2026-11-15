/** Assessment regression proof on two temporary PostgreSQL databases. */
import 'dotenv/config';
import 'reflect-metadata';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { randomUUID } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { Pool } from 'pg';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { SnapshotQuestion } from '../src/attempts/question-snapshot';
import { questionWeight, roundScore } from '../src/attempts/scoring';
import { seedAssessment } from '../prisma/lib/seed-assessment';
import { auditAssessment } from '../prisma/lib/audit-assessment';
import { backupDatabase, restoreDatabase } from '../prisma/lib/postgres-tools';

const exec = promisify(execFile);
const root = path.resolve(__dirname, '..');
const sourceUrl = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;
if (!sourceUrl) throw new Error('Cần DATABASE_URL hoặc TEST_DATABASE_URL để tạo DB tạm');
const suffix = randomUUID().replaceAll('-', '').slice(0, 12);
const artifacts = path.join(root, 'test-results', 'assessment', suffix);
fs.mkdirSync(artifacts, { recursive: true });
const created = new Set<string>();
const admin = new Pool({ connectionString: sourceUrl, connectionTimeoutMillis: 10000 });
let prisma: PrismaClient | undefined;
let pool: Pool | undefined;
let app: INestApplication | undefined;

function identifier(name: string) {
  assert.match(name, /^[a-z_][a-z0-9_]*$/);
  return '"' + name + '"';
}
function dbUrl(name: string) {
  const url = new URL(sourceUrl!);
  url.pathname = '/' + name;
  return url.toString();
}
async function createDatabase(name: string) {
  assert.match(name, /^assessment_(verify|restore)_[a-f0-9]{12}$/);
  await admin.query('CREATE DATABASE ' + identifier(name));
  created.add(name);
}
async function fingerprints(url: string) {
  const connection = new Pool({ connectionString: url });
  try {
    const tables = await connection.query<{ tablename: string }>(
      "SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename",
    );
    const result: Record<string, { count: number; hash: string }> = {};
    for (const { tablename } of tables.rows) {
      const rows = await connection.query(
        'SELECT count(*)::int AS count, md5(COALESCE(jsonb_agg(to_jsonb(r) ORDER BY to_jsonb(r)::text)::text, \'[]\')) AS hash FROM ' + identifier(tablename) + ' r',
      );
      result[tablename] = rows.rows[0];
    }
    return result;
  } finally { await connection.end(); }
}

async function main() {
  const verifyName = 'assessment_verify_' + suffix;
  await createDatabase(verifyName);
  const targetUrl = dbUrl(verifyName);
  await exec(process.execPath, [path.join(root, 'node_modules/prisma/build/index.js'), 'migrate', 'deploy'], {
    cwd: root, env: { ...process.env, DATABASE_URL: targetUrl },
  });
  pool = new Pool({ connectionString: targetUrl });
  prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
  const seed = await seedAssessment(prisma);
  assert.deepEqual(seed.exams.map((exam) => exam.questions), [120, 120, 120]);
  assert.equal(await prisma.exam.count(), 3);
  assert.equal(await prisma.question.count(), 492);
  const links = await prisma.examQuestion.findMany({ orderBy: [{ examId: 'asc' }, { order: 'asc' }] });
  const options = await prisma.questionOption.findMany({ orderBy: { id: 'asc' } });
  const englishLinks = await prisma.examQuestion.findMany({
    where: { question: { topic: { name: 'Tiếng Anh' } } },
  });
  assert.equal(englishLinks.length, 90);
  assert.equal(new Set(englishLinks.map((link) => link.questionId)).size, 90);
  await seedAssessment(prisma);
  assert.deepEqual(await prisma.examQuestion.findMany({ orderBy: [{ examId: 'asc' }, { order: 'asc' }] }), links);
  assert.deepEqual(await prisma.questionOption.findMany({ orderBy: { id: 'asc' } }), options);
  console.log('PASS seed twice: 3 exams, 120 questions each, stable links and option IDs');

  process.env.DATABASE_URL = targetUrl;
  process.env.JWT_SECRET = 'assessment-temporary-proof-secret';
  process.env.JWT_EXPIRES_IN = '1h';
  const { AppModule } = require('../src/app.module');
  app = await NestFactory.create(AppModule, { logger: false });
  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  await app.listen(0, '127.0.0.1');
  const baseUrl = (await app.getUrl()) + '/api';
  let token = '';
  async function request(method: string, route: string, body?: unknown, status = 200) {
    const response = await fetch(baseUrl + route, {
      method,
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const result = await response.json();
    assert.equal(response.status, status, method + ' ' + route + ' ' + JSON.stringify(result));
    return result;
  }
  const account = { email: 'assessment-proof@example.test', password: 'AssessmentProof@123', fullName: 'Assessment proof' };
  await request('POST', '/auth/register', account, 201);
  token = (await request('POST', '/auth/login', account, 201)).accessToken;
  for (const exam of seed.exams) {
    const publicExam = await request('GET', '/exams/' + exam.id);
    assert.equal(publicExam.questions.length, 120);
    assert.ok(!JSON.stringify(publicExam).includes('"isCorrect":'));
    assert.ok(!JSON.stringify(publicExam).includes('"explanation":'));
    const attempt = await request('POST', '/attempts', { examId: exam.id }, 201);
    const answers: { questionSnapshot: unknown }[] = await prisma.examAnswer.findMany({ where: { attemptId: attempt.attemptId } });
    assert.equal(answers.length, 120);
    const frozen = answers.map((answer) => answer.questionSnapshot as unknown as SnapshotQuestion);
    if (exam.id === 'vact-exam-2024') {
      const original = frozen[0];
      await prisma.question.update({ where: { id: original.id }, data: { content: 'Edited after starting' } });
      for (const option of original.options) {
        await prisma.questionOption.update({ where: { id: option.id }, data: { isCorrect: !option.isCorrect } });
      }
      const running = await request('GET', '/attempts/' + attempt.attemptId);
      assert.equal(running.questions.find((question: { questionId: string }) => question.questionId === original.id).content, original.content);
    }
    for (const question of frozen) {
      const correct = question.options.find((option) => option.isCorrect)!;
      await request('PUT', '/attempts/' + attempt.attemptId + '/answers/' + question.id, { selectedOptionIds: [correct.id] });
    }
    const result = await request('POST', '/attempts/' + attempt.attemptId + '/submit', {}, 201);
    assert.equal(result.score, 120);
    assert.equal(result.total, 120);
    assert.equal(result.weightedScore, roundScore(frozen.reduce((sum, question) => sum + questionWeight(question.difficulty), 0)));
    await request('POST', '/attempts/' + attempt.attemptId + '/submit', {}, 400);
    const beforeReseed = await request('GET', '/attempts/' + attempt.attemptId + '/results');
    await seedAssessment(prisma);
    assert.deepEqual(await request('GET', '/attempts/' + attempt.attemptId + '/results'), beforeReseed);
  }
  assert.equal((await request('GET', '/attempts/history')).length, 3);
  const audit = await auditAssessment(prisma);
  assert.deepEqual(audit.issues, []);
  assert.equal(audit.missingSnapshots, 0);
  console.log('PASS HTTP: 3 complete exams, snapshot grading, resubmission, reseed and audit');
  await app.close();
  app = undefined;

  const before = await fingerprints(targetUrl);
  const dump = await backupDatabase(targetUrl, path.join(artifacts, 'assessment.dump'));
  const restoreName = 'assessment_restore_' + suffix;
  await createDatabase(restoreName);
  await restoreDatabase(dbUrl(restoreName), dump);
  assert.deepEqual(await fingerprints(dbUrl(restoreName)), before);
  await assert.rejects(() => restoreDatabase(dbUrl(restoreName), dump), /database kiểm thử rỗng/);
  console.log('PASS backup/restore: every public table count/hash matches');
  fs.writeFileSync(path.join(artifacts, 'report.json'), JSON.stringify({ status: 'PASS', seed, audit, restoredTables: Object.keys(before).length }, null, 2));
  console.log('Assessment INTEGRATION PASS. Report: ' + path.relative(root, path.join(artifacts, 'report.json')));
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(async () => {
  if (app) await app.close();
  if (prisma) await prisma.$disconnect();
  if (pool) await pool.end();
  for (const name of created) {
    assert.match(name, /^assessment_(verify|restore)_[a-f0-9]{12}$/);
    await admin.query('DROP DATABASE ' + identifier(name) + ' WITH (FORCE)');
  }
  await admin.end();
});
