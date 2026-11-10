/**
 * Kịch bản kiểm thử end-to-end luồng cốt lõi (dùng cho ảnh chụp báo cáo).
 *
 * register → login → POST /attempts → PUT answers → POST submit
 *          → GET results → GET analysis → GET history
 *
 * Trả lời đúng ~70% câu để kết quả có cả đúng/sai/bỏ trống trên 4 chủ đề.
 * Chạy: npx ts-node prisma/e2e_proof.ts   (cần backend đang chạy ở :3000)
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const BASE = process.env.E2E_BASE ?? 'http://localhost:3000/api';
const EXAM_ID = 'vact-exam-demo-120';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

let token = '';

async function call(method: string, path: string, body?: unknown) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!res.ok) {
    throw new Error(`${method} ${path} → ${res.status}: ${text.slice(0, 300)}`);
  }
  return data;
}

function step(n: number, label: string) {
  console.log(`\n[${n}] ${label}`);
}

async function main() {
  const email = `e2e_${Date.now()}@vact.test`;
  const password = 'Test@12345';

  step(1, 'POST /auth/register');
  await call('POST', '/auth/register', {
    email,
    password,
    fullName: 'E2E Learner',
  });
  console.log(`    ✅ đã tạo ${email}`);

  step(2, 'POST /auth/login');
  const login = await call('POST', '/auth/login', { email, password });
  token = login.accessToken;
  console.log(
    `    ✅ role=${login.user.role} token=${String(token).slice(0, 24)}...`,
  );

  step(3, `POST /attempts (examId=${EXAM_ID})`);
  const created = await call('POST', '/attempts', { examId: EXAM_ID });
  const attemptId: string = created.attemptId;
  console.log(
    `    ✅ attemptId=${attemptId} totalQuestions=${created.totalQuestions} timeLimit=${created.timeLimit}`,
  );

  step(4, 'GET /attempts/:id (lấy nội dung câu hỏi)');
  const detail = await call('GET', `/attempts/${attemptId}`);
  console.log(`    ✅ nhận ${detail.questions.length} câu kèm option`);

  // Tra đáp án đúng trực tiếp từ DB để mô phỏng thí sinh làm đúng 70%
  const correctMap = new Map<string, string[]>();
  const options = await prisma.questionOption.findMany({
    where: { questionId: { in: detail.questions.map((q: any) => q.questionId) } },
    select: { id: true, questionId: true, isCorrect: true },
  });
  for (const o of options) {
    if (!o.isCorrect) continue;
    const arr = correctMap.get(o.questionId) ?? [];
    arr.push(o.id);
    correctMap.set(o.questionId, arr);
  }

  step(5, 'PUT /attempts/:id/answers/:questionId');
  let answeredCorrect = 0;
  let answeredWrong = 0;
  let left = 0;

  for (let i = 0; i < detail.questions.length; i++) {
    const q = detail.questions[i];
    const correct = correctMap.get(q.questionId) ?? [];
    const allIds: string[] = q.options.map((o: any) => o.id);

    // 10% bỏ trống, 70% đúng, 20% sai → đủ 3 trạng thái trên mọi chủ đề
    const bucket = i % 10;
    if (bucket === 9) {
      left++;
      continue;
    }

    let choice: string[];
    if (bucket <= 6 && correct.length) {
      choice = correct;
      answeredCorrect++;
    } else {
      const wrong = allIds.find((id) => !correct.includes(id));
      if (!wrong) {
        left++;
        continue;
      }
      choice = [wrong];
      answeredWrong++;
    }

    await call('PUT', `/attempts/${attemptId}/answers/${q.questionId}`, {
      selectedOptionIds: choice,
      timeSpent: 20 + (i % 40),
    });
  }
  console.log(
    `    ✅ đã lưu ${answeredCorrect + answeredWrong} đáp án (dự kiến đúng ${answeredCorrect}, sai ${answeredWrong}, bỏ trống ${left})`,
  );

  step(6, 'POST /attempts/:id/submit');
  const submitted = await call('POST', `/attempts/${attemptId}/submit`);
  console.log(
    `    ✅ status=${submitted.status} score=${submitted.score} weighted=${submitted.weightedScore}`,
  );

  step(7, 'GET /attempts/:id/results');
  const results = await call('GET', `/attempts/${attemptId}/results`);
  const s = results.summary;
  console.log(
    `    điểm thường:  ${results.score}/${results.total} (${s.percentage}%)`,
  );
  console.log(
    `    điểm trọng số: ${results.weightedScore}/${s.maxWeightedScore} (${s.weightedPercentage}%)`,
  );
  console.log(
    `    đúng=${s.correctCount} sai=${s.wrongCount} bỏ trống=${s.unansweredCount}`,
  );
  console.log('    --- Kết quả theo chủ đề ---');
  console.table(
    results.topicSummary.map((t: any) => ({
      'chủ đề': t.name,
      đúng: `${t.correct}/${t.total}`,
      'tỷ lệ': `${t.percentage}%`,
      'trọng số': t.weightedScore,
      'thời gian (s)': t.timeSpent,
    })),
  );
  const withExplanation = results.details.filter((d: any) => d.explanation).length;
  console.log(
    `    chi tiết: ${results.details.length} câu, ${withExplanation} câu có lời giải`,
  );

  step(8, 'GET /attempts/:id/analysis');
  const analysis = await call('GET', `/attempts/${attemptId}/analysis`);
  console.log(`    ✅ ${JSON.stringify(analysis).slice(0, 220)}...`);

  step(9, 'GET /attempts/history');
  const history = await call('GET', '/attempts/history');
  const list = Array.isArray(history) ? history : (history.items ?? []);
  console.log(`    ✅ ${list.length} lượt làm bài của tài khoản này`);
  console.table(
    list.slice(0, 5).map((h: any) => ({
      đề: h.exam?.title ?? '(đề tự sinh)',
      điểm: `${h.score}/${h.total ?? '-'}`,
      'trọng số': h.weightedScore,
      'nộp lúc': h.submittedAt,
    })),
  );

  step(10, 'Kiểm tra bảng attempt_topic_results trong DB');
  const topicRows = await prisma.attemptTopicResult.findMany({
    where: { attemptId },
    include: { topic: { select: { name: true } } },
  });
  console.table(
    topicRows.map((r) => ({
      topic: r.topic.name,
      correct: r.correct,
      total: r.total,
      weighted: r.weightedScore,
    })),
  );

  console.log('\n🎉 E2E PASS — luồng cốt lõi hoạt động đầu-cuối.');
}

main()
  .catch((e) => {
    console.error('\n❌ E2E FAIL:', e.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
