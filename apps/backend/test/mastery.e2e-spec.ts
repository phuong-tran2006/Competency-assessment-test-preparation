import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

/**
 * Test API thật cho Mastery & Recommendations (thay thế mock test).
 *
 * Yêu cầu: DATABASE_URL trỏ sang DB test riêng (vd app_db_test), đã `prisma migrate deploy`.
 * Mỗi test tự seed dữ liệu tối thiểu và dọn sạch sau khi chạy.
 */
describe('Mastery API (e2e, real backend)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const studentEmail = 'e2e-student@vact.test';
  const instructorEmail = 'e2e-instructor@vact.test';
  const password = 'Test@123';

  let studentToken = '';
  let instructorToken = '';

  async function authHeader(email: string) {
    const res = await request(app.getHttpServer()).post('/api/auth/login').send({ email, password });
    expect(res.status).toBe(201);
    expect(res.body.accessToken).toBeDefined();
    return `Bearer ${res.body.accessToken}`;
  }

  /** Seed tối thiểu: 2 user, 3 topic (child <- parent <- grandparent), câu hỏi vừa sức. */
  async function seedBasics() {
    const passwordHash = await bcrypt.hash(password, 10);
    await prisma.user.upsert({
      where: { email: studentEmail },
      update: { passwordHash, role: 'STUDENT' as never },
      create: { email: studentEmail, passwordHash, fullName: 'E2E Student', role: 'STUDENT' as never },
    });
    await prisma.user.upsert({
      where: { email: instructorEmail },
      update: { passwordHash, role: 'INSTRUCTOR' as never },
      create: { email: instructorEmail, passwordHash, fullName: 'E2E Instructor', role: 'INSTRUCTOR' as never },
    });
    for (const [id, name] of [['e2e-grandparent', 'E2E Grandparent'], ['e2e-parent', 'E2E Parent'], ['e2e-child', 'E2E Child'], ['e2e-extra', 'E2E Extra']] as const) {
      await prisma.topic.upsert({ where: { id }, update: { name }, create: { id, name } });
    }
    await prisma.topicPrerequisite.upsert({
      where: { topicId_prerequisiteId: { topicId: 'e2e-child', prerequisiteId: 'e2e-parent' } },
      update: {},
      create: { topicId: 'e2e-child', prerequisiteId: 'e2e-parent' },
    });
    await prisma.topicPrerequisite.upsert({
      where: { topicId_prerequisiteId: { topicId: 'e2e-parent', prerequisiteId: 'e2e-grandparent' } },
      update: {},
      create: { topicId: 'e2e-parent', prerequisiteId: 'e2e-grandparent' },
    });
    // Câu hỏi vừa sức cho parent (difficulty ~0.35 => rating ~1220, quanh Elo khởi đầu 1200).
    const topic = await prisma.topic.findUnique({ where: { id: 'e2e-parent' } });
    const q = await prisma.question.upsert({
      where: { id: 'e2e-q-parent-1' },
      update: { content: 'E2E Q1', topicId: topic!.id, difficulty: 0.35 },
      create: { id: 'e2e-q-parent-1', content: 'E2E Q1', topicId: topic!.id, difficulty: 0.35 },
    });
    await prisma.questionOption.deleteMany({ where: { questionId: q.id } });
    await prisma.questionOption.createMany({
      data: [
        { questionId: q.id, content: 'Đúng', isCorrect: true, order: 0 },
        { questionId: q.id, content: 'Sai', isCorrect: false, order: 1 },
      ],
    });
  }

  async function cleanup() {
    const users = await prisma.user.findMany({ where: { email: { in: [studentEmail, instructorEmail] } }, select: { id: true } });
    const userIds = users.map((u) => u.id);
    if (userIds.length) {
      await prisma.examAnswer.deleteMany({ where: { attempt: { userId: { in: userIds } } } });
      await prisma.examAttempt.deleteMany({ where: { userId: { in: userIds } } });
      await prisma.topicMastery.deleteMany({ where: { userId: { in: userIds } } });
      await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    }
    await prisma.examQuestion.deleteMany({ where: { questionId: 'e2e-q-parent-1' } });
    await prisma.questionOption.deleteMany({ where: { questionId: 'e2e-q-parent-1' } });
    await prisma.question.deleteMany({ where: { id: 'e2e-q-parent-1' } });
    await prisma.topicPrerequisite.deleteMany({
      where: { topicId: { in: ['e2e-child', 'e2e-parent'] } },
    });
    await prisma.topic.deleteMany({ where: { id: { in: ['e2e-child', 'e2e-parent', 'e2e-grandparent', 'e2e-extra'] } } });
  }

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    app.setGlobalPrefix('api');
    await app.init();
    prisma = app.get(PrismaService);
    await seedBasics();
    studentToken = await authHeader(studentEmail);
    instructorToken = await authHeader(instructorEmail);
  });

  afterAll(async () => {
    await cleanup();
    await app.close();
  });

  it('GET /api/users/me/mastery trả điểm theo chủ đề, topic chưa thi là Chưa đánh giá', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/users/me/mastery')
      .set('Authorization', studentToken);
    expect(res.status).toBe(200);
    const child = (res.body.items as any[]).find((i) => i.topicId === 'e2e-child');
    expect(child).toMatchObject({ masteryScore: 1200, evidenceCount: 0, isAssessed: false, level: 'Chưa đánh giá', ready: false });
    expect(child.unmetPrerequisiteIds).toEqual(expect.arrayContaining(['e2e-parent']));
  });

  it('GET /api/users/me/mastery/:topicId lọc đúng 1 chủ đề', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/users/me/mastery/e2e-parent')
      .set('Authorization', studentToken);
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(1);
    expect(res.body.items[0]).toMatchObject({ topicId: 'e2e-parent' });
  });

  it('GET /api/users/me/mastery/topic-lạ trả 404', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/users/me/mastery/khong-ton-tai')
      .set('Authorization', studentToken);
    expect(res.status).toBe(404);
  });

  it('GET /api/users/me/recommendations trả >= 3 gợi ý, topic bị chặn nhường cho prerequisite', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/users/me/recommendations?minutes=30')
      .set('Authorization', studentToken);
    expect(res.status).toBe(200);
    expect(res.body.items.length).toBeGreaterThanOrEqual(3);
    const topics = (res.body.items as any[]).map((i) => i.topicId);
    expect(topics).not.toContain('e2e-child');
    expect(res.body.items[0]).toHaveProperty('reason');
    expect(JSON.stringify(res.body)).not.toContain('isCorrect');
  });

  it('GET /api/users/me/recommendations/:topicId trả chi tiết + câu hỏi vừa sức', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/users/me/recommendations/e2e-parent?minutes=30')
      .set('Authorization', studentToken);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ topicId: 'e2e-parent', ready: false });
    expect(res.body.unmetPrerequisites.map((u: any) => u.topicId)).toContain('e2e-grandparent');
    expect(res.body.reason).toContain('E2E Grandparent');
    expect(res.body.questions.length).toBeGreaterThanOrEqual(1);
    expect(JSON.stringify(res.body.questions)).not.toContain('isCorrect');
  });

  it('thi thật 1 câu đúng -> Elo tăng, làm lại câu sai -> Elo giảm', async () => {
    const me = await prisma.user.findUnique({ where: { email: studentEmail } });
    const correct = await prisma.questionOption.findFirst({ where: { questionId: 'e2e-q-parent-1', isCorrect: true } });
    const wrong = await prisma.questionOption.findFirst({ where: { questionId: 'e2e-q-parent-1', isCorrect: false } });
    // Lần 1: trả lời đúng.
    const started = await request(app.getHttpServer())
      .post('/api/attempts')
      .set('Authorization', studentToken)
      .send({ questionCount: 1, topicIds: ['e2e-parent'], durationMin: 15 });
    expect(started.status).toBe(201);
    const attemptId: string = started.body.attemptId ?? started.body.id;
    const detail = await request(app.getHttpServer()).get(`/api/attempts/${attemptId}`).set('Authorization', studentToken);
    const q = (detail.body.questions as any[]).find((x) => x.questionId === 'e2e-q-parent-1') ?? detail.body.questions[0];
    await request(app.getHttpServer())
      .put(`/api/attempts/${attemptId}/answers/${q.questionId}`)
      .set('Authorization', studentToken)
      .send({ selectedOptionIds: [correct!.id] })
      .expect(200);
    await request(app.getHttpServer()).post(`/api/attempts/${attemptId}/submit`).set('Authorization', studentToken).expect(201);
    const mastery = await prisma.topicMastery.findUnique({
      where: { userId_topicId: { userId: me!.id, topicId: 'e2e-parent' } },
    });
    expect(mastery).toBeDefined();
    expect(mastery!.attempts).toBe(1);
    expect(mastery!.masteryScore).toBeGreaterThan(1200);
    const afterCorrect = mastery!.masteryScore;

    // Lần 2: trả lời sai cùng câu -> Elo giảm so với sau lần đúng.
    const started2 = await request(app.getHttpServer())
      .post('/api/attempts')
      .set('Authorization', studentToken)
      .send({ questionCount: 1, topicIds: ['e2e-parent'], durationMin: 15 });
    const attemptId2: string = started2.body.attemptId ?? started2.body.id;
    const detail2 = await request(app.getHttpServer()).get(`/api/attempts/${attemptId2}`).set('Authorization', studentToken);
    const q2 = (detail2.body.questions as any[]).find((x: any) => x.questionId === 'e2e-q-parent-1') ?? detail2.body.questions[0];
    await request(app.getHttpServer())
      .put(`/api/attempts/${attemptId2}/answers/${q2.questionId}`)
      .set('Authorization', studentToken)
      .send({ selectedOptionIds: [wrong!.id] })
      .expect(200);
    await request(app.getHttpServer()).post(`/api/attempts/${attemptId2}/submit`).set('Authorization', studentToken).expect(201);
    const mastery2 = await prisma.topicMastery.findUnique({
      where: { userId_topicId: { userId: me!.id, topicId: 'e2e-parent' } },
    });
    expect(mastery2!.attempts).toBe(2);
    expect(mastery2!.masteryScore).toBeLessThan(afterCorrect);
  });

  it('không token -> 401, instructor gọi route student -> 403', async () => {
    await request(app.getHttpServer()).get('/api/users/me/mastery').expect(401);
    await request(app.getHttpServer())
      .get('/api/users/me/recommendations')
      .set('Authorization', instructorToken)
      .expect(403);
  });

  it('minutes quá giới hạn bị ValidationPipe chặn 400', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/users/me/recommendations?minutes=500')
      .set('Authorization', studentToken);
    expect(res.status).toBe(400);
  });
});
