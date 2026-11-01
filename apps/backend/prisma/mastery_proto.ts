/**
 * PROTOTYPE THÀNH PHẦN NÂNG CAO — Mastery theo chủ đề bằng Elo 1 phía.
 *
 * Mục đích: chứng minh công thức trong src/mastery/elo.ts chạy được trên dữ
 * liệu thật, đồng thời đo xem nó dự báo đúng/sai của người học tốt hơn baseline
 * bao nhiêu. Script KHÔNG sửa dữ liệu bài làm, chỉ ghi bảng topic_masteries.
 *
 * Chạy: npm run mastery:proto
 */
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import {
  INITIAL_RATING,
  expectedScore,
  updateRating,
  ratingToLevel,
} from '../src/mastery/elo';

dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) } as any);

type Event = {
  userId: string;
  topicId: string;
  topicName: string;
  difficulty: number;
  correct: boolean;
};

/** Brier score: trung bình bình phương sai số dự báo. Càng nhỏ càng tốt. */
function brier(preds: number[], actuals: number[]): number {
  const s = preds.reduce((acc, p, i) => acc + (p - actuals[i]) ** 2, 0);
  return s / preds.length;
}

/** Log loss: phạt nặng dự báo tự tin mà sai. Càng nhỏ càng tốt. */
function logLoss(preds: number[], actuals: number[]): number {
  const eps = 1e-12;
  const s = preds.reduce((acc, p, i) => {
    const q = Math.min(1 - eps, Math.max(eps, p));
    return acc + -(actuals[i] * Math.log(q) + (1 - actuals[i]) * Math.log(1 - q));
  }, 0);
  return s / preds.length;
}

/** Tỷ lệ dự báo đúng khi quy p >= 0.5 thành "sẽ làm đúng". */
function accuracy(preds: number[], actuals: number[]): number {
  const hit = preds.filter((p, i) => (p >= 0.5 ? 1 : 0) === actuals[i]).length;
  return hit / preds.length;
}

const pct = (x: number) => `${(x * 100).toFixed(1)}%`;

async function main() {
  console.log('=== PROTOTYPE MASTERY (Elo theo chủ đề) ===\n');

  // ---- B1: lấy chuỗi sự kiện trả lời theo thứ tự thời gian ----
  const attempts = await prisma.examAttempt.findMany({
    where: { status: 'SUBMITTED' },
    include: { answers: { orderBy: { id: 'asc' } } },
    orderBy: [{ submittedAt: 'asc' }, { startedAt: 'asc' }],
  });

  const questionIds = [
    ...new Set(attempts.flatMap((a) => a.answers.map((x) => x.questionId))),
  ];
  const questions = await prisma.question.findMany({
    where: { id: { in: questionIds } },
    select: {
      id: true,
      difficulty: true,
      topicId: true,
      topic: { select: { name: true } },
    },
  });
  const qMap = new Map(questions.map((q) => [q.id, q]));

  const events: Event[] = [];
  for (const attempt of attempts) {
    // userId nullable (onDelete: SetNull) — lượt thi mồ côi không gắn được mastery
    if (!attempt.userId) continue;
    const userId = attempt.userId;

    for (const answer of attempt.answers) {
      const q = qMap.get(answer.questionId);
      if (!q) continue;
      // Câu bỏ trống không có bằng chứng về năng lực -> loại khỏi chuỗi học
      if (!answer.selectedOptionIds?.length) continue;
      // Câu chưa gắn chủ đề thì không thể quy về mastery của chủ đề nào
      if (!q.topicId) continue;
      events.push({
        userId,
        topicId: q.topicId,
        topicName: q.topic?.name ?? q.topicId,
        difficulty: q.difficulty ?? 0.5,
        correct: answer.isCorrect,
      });
    }
  }

  console.log(
    `[1] ${attempts.length} lượt thi đã nộp -> ${events.length} câu trả lời có chọn đáp án`,
  );

  if (!events.length) {
    console.log('Chưa có dữ liệu để chạy prototype. Hãy chạy npm run e2e:proof trước.');
    return;
  }

  // ---- B2: phát lại chuỗi, vừa dự báo vừa cập nhật rating ----
  // Dự báo luôn thực hiện TRƯỚC khi cập nhật (prequential / online evaluation)
  // nên không có rò rỉ nhãn.
  const ratings = new Map<string, number>(); // key = userId::topicId
  const counts = new Map<string, number>();
  const eloPreds: number[] = [];
  const actuals: number[] = [];

  for (const e of events) {
    const key = `${e.userId}::${e.topicId}`;
    const current = ratings.get(key) ?? INITIAL_RATING;

    eloPreds.push(expectedScore(current, e.difficulty));
    actuals.push(e.correct ? 1 : 0);

    ratings.set(key, updateRating(current, e.difficulty, e.correct));
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  // ---- B3: hai baseline để đối chiếu ----
  // B-0: đoán theo tỷ lệ đúng trung bình toàn hệ thống (không cá nhân hóa).
  const baseRate = actuals.reduce((a, b) => a + b, 0) / actuals.length;
  const basePreds = actuals.map(() => baseRate);

  // B-1: đoán theo độ khó câu hỏi (1 - difficulty), vẫn không cá nhân hóa.
  const diffPreds = events.map((e) => 1 - Math.min(1, Math.max(0, e.difficulty)));

  const models = [
    { name: 'B-0 tỷ lệ đúng trung bình', preds: basePreds },
    { name: 'B-1 theo độ khó câu hỏi', preds: diffPreds },
    { name: 'Elo mastery (prototype)', preds: eloPreds },
  ];

  // Độ khó trung bình quyết định questionRating trung bình, tức là mốc mà
  // rating khởi đầu cần nằm gần để dự báo không lệch ngay từ câu đầu.
  const avgDiff =
    events.reduce((a, e) => a + e.difficulty, 0) / events.length;

  console.log(`[2] Tỷ lệ đúng thực tế của toàn bộ chuỗi: ${pct(baseRate)}`);
  console.log(
    `    Độ khó trung bình: ${avgDiff.toFixed(3)} ` +
      `-> questionRating trung bình ≈ ${Math.round(800 + avgDiff * 1200)}`,
  );
  console.log(
    `    Dự báo của Elo ở câu đầu (rating ${INITIAL_RATING}): ` +
      `${pct(expectedScore(INITIAL_RATING, avgDiff))} trong khi thực tế ${pct(baseRate)}\n`,
  );
  console.log('[3] Chất lượng dự báo (thấp hơn là tốt hơn với Brier/LogLoss):');
  console.table(
    models.map((m) => ({
      'Mô hình': m.name,
      Brier: brier(m.preds, actuals).toFixed(4),
      LogLoss: logLoss(m.preds, actuals).toFixed(4),
      'Accuracy@0.5': pct(accuracy(m.preds, actuals)),
    })),
  );

  const eloBrier = brier(eloPreds, actuals);
  const b0Brier = brier(basePreds, actuals);
  const skill = (b0Brier - eloBrier) / b0Brier;
  console.log(
    `    Brier Skill Score so với B-0: ${(skill * 100).toFixed(1)}% ` +
      `(>0 nghĩa là Elo tốt hơn baseline)\n`,
  );

  // ---- B3b: hiệu chuẩn cold start ----
  // INITIAL_RATING = 1200 nằm dưới questionRating trung bình (800 + 0.59*1200
  // ≈ 1508) nên ngay câu đầu mô hình dự báo chỉ ~15% đúng, trong khi thực tế
  // 73.7%. Quét lưới để biết cặp (rating khởi đầu, K) nào khớp dữ liệu.
  function replay(initial: number, k: number): number[] {
    const r = new Map<string, number>();
    const preds: number[] = [];
    for (const e of events) {
      const key = `${e.userId}::${e.topicId}`;
      const cur = r.get(key) ?? initial;
      const p = expectedScore(cur, e.difficulty);
      preds.push(p);
      r.set(key, cur + k * ((e.correct ? 1 : 0) - p));
    }
    return preds;
  }

  const grid: { initial: number; k: number; brier: number }[] = [];
  for (const initial of [1200, 1400, 1500, 1600, 1700, 1800]) {
    for (const k of [8, 16, 32, 64]) {
      grid.push({ initial, k, brier: brier(replay(initial, k), actuals) });
    }
  }
  grid.sort((a, b) => a.brier - b.brier);
  const best = grid[0];

  console.log('[3b] Hiệu chuẩn cold start — 5 cấu hình tốt nhất:');
  console.table(
    grid.slice(0, 5).map((g) => ({
      'Rating khởi đầu': g.initial,
      K: g.k,
      Brier: g.brier.toFixed(4),
      'BSS vs B-0': `${(((b0Brier - g.brier) / b0Brier) * 100).toFixed(1)}%`,
    })),
  );
  console.log(
    `    Cấu hình hiện tại (1200, K=32) Brier ${eloBrier.toFixed(4)} ` +
      `-> sau hiệu chuẩn (${best.initial}, K=${best.k}) Brier ${best.brier.toFixed(4)}\n`,
  );

  // ---- B3c: mô phỏng để kiểm chứng công thức có hồi phục được năng lực thật ----
  // Dữ liệu E2E hiện tại gán đúng/sai theo chu kỳ, độc lập với độ khó, nên
  // không mô hình nào dùng difficulty có thể thắng tỷ lệ đúng trung bình.
  // Mô phỏng này sinh dữ liệu theo đúng giả thiết Elo để kiểm tra phần hiện
  // thực (không phải kiểm tra tính đúng của giả thiết trên người học thật).
  const SIM_LEARNERS = 200;
  const SIM_ITEMS = 60;
  let rngState = 42;
  const rand = () => {
    // LCG để kết quả mô phỏng lặp lại được giữa các lần chạy
    rngState = (rngState * 1103515245 + 12345) % 2147483648;
    return rngState / 2147483648;
  };

  const trueAbility: number[] = [];
  const estimated: number[] = [];
  for (let i = 0; i < SIM_LEARNERS; i++) {
    const truth = 1000 + rand() * 800; // năng lực thật 1000..1800
    let est = best.initial;
    for (let j = 0; j < SIM_ITEMS; j++) {
      const difficulty = rand();
      const pTrue = expectedScore(truth, difficulty);
      const correct = rand() < pTrue;
      est = est + best.k * ((correct ? 1 : 0) - expectedScore(est, difficulty));
    }
    trueAbility.push(truth);
    estimated.push(est);
  }

  const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
  const mt = mean(trueAbility);
  const me = mean(estimated);
  const cov = trueAbility.reduce(
    (acc, t, i) => acc + (t - mt) * (estimated[i] - me),
    0,
  );
  const sdT = Math.sqrt(trueAbility.reduce((a, t) => a + (t - mt) ** 2, 0));
  const sdE = Math.sqrt(estimated.reduce((a, e) => a + (e - me) ** 2, 0));
  const corr = cov / (sdT * sdE);
  const mae = mean(trueAbility.map((t, i) => Math.abs(t - estimated[i])));

  console.log(
    `[3c] Mô phỏng ${SIM_LEARNERS} người học × ${SIM_ITEMS} câu ` +
      `(cấu hình ${best.initial}, K=${best.k}):`,
  );
  console.log(`    Tương quan rating ước lượng vs năng lực thật: ${corr.toFixed(3)}`);
  console.log(`    Sai số tuyệt đối trung bình: ${mae.toFixed(1)} điểm rating\n`);

  // ---- B4: ghi kết quả vào topic_masteries ----
  const topicNames = new Map(events.map((e) => [e.topicId, e.topicName]));
  let written = 0;
  for (const [key, rating] of ratings) {
    const [userId, topicId] = key.split('::');
    await prisma.topicMastery.upsert({
      where: { userId_topicId: { userId, topicId } },
      create: { userId, topicId, rating, attempts: counts.get(key) ?? 0 },
      update: { rating, attempts: counts.get(key) ?? 0 },
    });
    written += 1;
  }
  console.log(`[4] Đã ghi ${written} dòng vào topic_masteries\n`);

  // ---- B5: in bản đồ năng lực của người học có nhiều dữ liệu nhất ----
  const perUser = new Map<string, number>();
  for (const [key, n] of counts) {
    const userId = key.split('::')[0];
    perUser.set(userId, (perUser.get(userId) ?? 0) + n);
  }
  const topUser = [...perUser.entries()].sort((a, b) => b[1] - a[1])[0][0];
  const user = await prisma.user.findUnique({
    where: { id: topUser },
    select: { email: true },
  });

  console.log(`[5] Bản đồ năng lực của ${user?.email ?? topUser}:`);
  console.table(
    [...ratings.entries()]
      .filter(([key]) => key.startsWith(`${topUser}::`))
      .map(([key, rating]) => ({
        'Chủ đề': topicNames.get(key.split('::')[1]) ?? key,
        Rating: rating,
        'Xếp loại': ratingToLevel(rating),
        'Số câu': counts.get(key) ?? 0,
      }))
      .sort((a, b) => b.Rating - a.Rating),
  );

  // ---- B6: gợi ý ôn tập suy ra từ rating (đầu vào cho lộ trình cá nhân hóa) ----
  const weakest = [...ratings.entries()]
    .filter(([key]) => key.startsWith(`${topUser}::`))
    .sort((a, b) => a[1] - b[1])
    .slice(0, 2);
  console.log('[6] Chủ đề cần ưu tiên ôn tập:');
  for (const [key, rating] of weakest) {
    const name = topicNames.get(key.split('::')[1]);
    console.log(`    - ${name} (rating ${rating}, ${ratingToLevel(rating)})`);
  }

  console.log('\n✅ PROTOTYPE HOÀN TẤT');
}

main()
  .catch((e) => {
    console.error('❌ Lỗi prototype:', e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
