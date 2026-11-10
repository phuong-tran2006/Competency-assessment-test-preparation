import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { prerequisiteAncestors, prerequisiteMap } from '../topics/prerequisite-graph';
import { INITIAL_RATING, ratingToLevel, updateRating } from './elo';
import { MasteryHistoryQueryDto, MasteryQueryDto, PracticeQuestionsQueryDto, RecommendationsQueryDto } from './dto/mastery-query.dto';

@Injectable()
export class MasteryService {
  constructor(private readonly prisma: PrismaService) {}

  private async assertStudent(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
    if (!user || user.role !== Role.STUDENT) throw new NotFoundException('Không tìm thấy sinh viên');
  }

  private async assertTopic(topicId?: string) {
    if (topicId && !await this.prisma.topic.findUnique({ where: { id: topicId }, select: { id: true } })) {
      throw new NotFoundException('Không tìm thấy chủ đề');
    }
  }

  async getProfile(userId: string, query: MasteryQueryDto = new MasteryQueryDto()) {
    await this.assertStudent(userId);
    const [topics, scores, edges, history] = await Promise.all([
      this.prisma.topic.findMany({ select: { id: true, name: true }, orderBy: [{ name: 'asc' }, { id: 'asc' }] }),
      this.prisma.topicMastery.findMany({ where: { userId } }),
      this.prisma.topicPrerequisite.findMany({ select: { topicId: true, prerequisiteId: true } }),
      this.prisma.$queryRaw<Array<{ topicId: string; attemptCount: number }>>`
        SELECT COALESCE(a."topicIdAtSubmission", q."topicId") AS "topicId",
               COUNT(DISTINCT e."id")::int AS "attemptCount"
        FROM "exam_answers" a
        JOIN "exam_attempts" e ON e."id" = a."attemptId"
        JOIN "questions" q ON q."id" = a."questionId"
        WHERE e."userId" = ${userId} AND e."status" = 'SUBMITTED'
        GROUP BY COALESCE(a."topicIdAtSubmission", q."topicId")`,
    ]);
    if (query.topicId && !topics.some((topic) => topic.id === query.topicId)) {
      throw new NotFoundException('Không tìm thấy chủ đề');
    }
    const byTopic = new Map(scores.map((score) => [score.topicId, score]));
    const historicalCounts = new Map(history.map((row) => [row.topicId, row.attemptCount]));
    const graph = prerequisiteMap(edges);
    const threshold = query.masteryThreshold ?? 1300;
    const selected = topics.filter((topic) => !query.topicId || topic.id === query.topicId);
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const items = selected.slice((page - 1) * limit, page * limit).map((topic) => {
      const score = byTopic.get(topic.id);
      const isAssessed = (score?.attempts ?? 0) > 0;
      const masteryScore = score?.masteryScore ?? INITIAL_RATING;
      const ancestors = prerequisiteAncestors(graph, topic.id);
      const prerequisiteCycle = (graph.get(topic.id) ?? []).includes(topic.id) ||
        ancestors.some(({ id }) => (graph.get(id) ?? []).includes(topic.id));
      const unmetPrerequisiteIds = ancestors.filter(({ id }) => {
        const parent = byTopic.get(id);
        return !parent || parent.attempts === 0 || parent.masteryScore < threshold;
      }).map(({ id }) => id);
      return {
        topicId: topic.id,
        name: topic.name,
        masteryScore,
        evidenceCount: score?.attempts ?? 0,
        hasHistory: isAssessed || (historicalCounts.get(topic.id) ?? 0) > 0,
        submittedAttemptCount: historicalCounts.get(topic.id) ?? 0,
        isAssessed,
        level: isAssessed ? ratingToLevel(masteryScore) : 'Chưa đánh giá',
        isMastered: isAssessed && masteryScore >= threshold,
        updatedAt: score?.updatedAt ?? null,
        prerequisiteIds: graph.get(topic.id) ?? [],
        ancestorIds: ancestors.map(({ id }) => id),
        unmetPrerequisiteIds,
        prerequisiteCycle,
        ready: !prerequisiteCycle && unmetPrerequisiteIds.length === 0,
      };
    });
    return { userId, initialMasteryScore: INITIAL_RATING, masteryThreshold: threshold, items, total: selected.length, page, limit };
  }

  async getQuestions(userId: string, query: PracticeQuestionsQueryDto) {
    await this.assertStudent(userId);
    await this.assertTopic(query.topicId);
    if (query.difficultyMin !== undefined && query.difficultyMax !== undefined && query.difficultyMin > query.difficultyMax) {
      throw new BadRequestException('difficultyMin không được lớn hơn difficultyMax');
    }
    const where: Prisma.QuestionWhereInput = {
      topicId: query.topicId,
      difficulty: { gte: query.difficultyMin, lte: query.difficultyMax },
      ...(query.unseenOnly ? { answers: { none: { attempt: { userId, status: 'SUBMITTED' } } } } : {}),
    };
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const [items, total] = await Promise.all([
      this.prisma.question.findMany({
        where, skip: (page - 1) * limit, take: limit,
        orderBy: [{ difficulty: 'asc' }, { id: 'asc' }],
        select: { id: true, content: true, type: true, difficulty: true, topicId: true, topic: { select: { id: true, name: true } } },
      }),
      this.prisma.question.count({ where }),
    ]);
    return { items, total, page, limit };
  }

  async getHistory(userId: string, query: MasteryHistoryQueryDto) {
    await this.assertStudent(userId);
    await this.assertTopic(query.topicId);
    const answerWhere: Prisma.ExamAnswerWhereInput = query.topicId ? {
      OR: [
        { topicIdAtSubmission: query.topicId },
        { topicIdAtSubmission: null, question: { topicId: query.topicId } },
      ],
    } : {};
    const where: Prisma.ExamAttemptWhereInput = { userId, status: 'SUBMITTED', answers: { some: answerWhere } };
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const [attempts, total] = await Promise.all([
      this.prisma.examAttempt.findMany({
        where, skip: (page - 1) * limit, take: limit,
        orderBy: [{ submittedAt: query.order ?? 'desc' }, { id: query.order ?? 'desc' }],
        select: {
          id: true, examId: true, startedAt: true, submittedAt: true, masteryUpdatedAt: true,
          score: true, weightedScore: true, total: true,
          answers: { where: answerWhere, orderBy: { id: 'asc' }, select: {
            questionId: true, isCorrect: true, selectedOptionIds: true, timeSpent: true,
            difficultyAtSubmission: true, topicIdAtSubmission: true,
            question: { select: { difficulty: true, topicId: true } },
          } },
        },
      }),
      this.prisma.examAttempt.count({ where }),
    ]);
    return {
      userId, items: attempts.map(({ answers, ...attempt }) => ({
        ...attempt,
        answers: answers.map(({ question, selectedOptionIds, difficultyAtSubmission, topicIdAtSubmission, ...answer }) => ({
          ...answer,
          answered: selectedOptionIds.length > 0,
          difficulty: difficultyAtSubmission ?? question.difficulty,
          topicId: topicIdAtSubmission ?? question.topicId,
        })),
      })), total, page, limit,
    };
  }

  /** Gợi ý học tập cá nhân hóa: topic yếu trước, chặn bởi DAG, câu hỏi vừa sức, bài học tiếp theo. */
  async getRecommendations(userId: string, query: RecommendationsQueryDto = new RecommendationsQueryDto()) {
    await this.assertStudent(userId);
    const minutes = query.minutes ?? 30;
    const threshold = query.masteryThreshold ?? 1300;
    const [topics, scores, edges, courseTopics, enrollments, progress] = await Promise.all([
      this.prisma.topic.findMany({ select: { id: true, name: true }, orderBy: [{ name: 'asc' }, { id: 'asc' }] }),
      this.prisma.topicMastery.findMany({ where: { userId } }),
      this.prisma.topicPrerequisite.findMany({ select: { topicId: true, prerequisiteId: true } }),
      this.prisma.courseTopic.findMany({
        orderBy: [{ order: 'asc' }, { courseId: 'asc' }],
        select: { topicId: true, order: true, course: { select: { id: true, title: true, status: true } } },
      }),
      this.prisma.enrollment.findMany({ where: { userId }, select: { courseId: true } }),
      this.prisma.lessonProgress.findMany({ where: { userId, isCompleted: true }, select: { lessonId: true } }),
    ]);
    if (!topics.length) return { userId, minutes, masteryThreshold: threshold, items: [] };
    const byTopic = new Map(scores.map((score) => [score.topicId, score]));
    const byId = new Map(topics.map((topic) => [topic.id, topic]));
    const graph = prerequisiteMap(edges);
    const states = topics.map((topic) => {
      const score = byTopic.get(topic.id);
      const attempts = score?.attempts ?? 0;
      const masteryScore = score?.masteryScore ?? INITIAL_RATING;
      const ancestors = prerequisiteAncestors(graph, topic.id);
      const unmet = ancestors.filter(({ id }) => {
        const parent = byTopic.get(id);
        return !parent || parent.attempts === 0 || parent.masteryScore < threshold;
      }).map(({ id }) => id);
      const cycle = (graph.get(topic.id) ?? []).includes(topic.id);
      return {
        topicId: topic.id, name: topic.name, masteryScore, attempts,
        isAssessed: attempts > 0, isMastered: attempts > 0 && masteryScore >= threshold,
        unmetPrerequisiteIds: unmet, ready: !cycle && unmet.length === 0,
      };
    });
    // Thứ tự ưu tiên: yếu-chưa-đạt & học được trước, rồi chưa đánh giá, rồi đã đạt, cuối cùng bị chặn.
    const weak = states.filter((s) => s.isAssessed && !s.isMastered && s.ready).sort((a, b) => a.masteryScore - b.masteryScore);
    const fresh = states.filter((s) => !s.isAssessed && s.ready);
    const mastered = states.filter((s) => s.isMastered && s.ready).sort((a, b) => a.masteryScore - b.masteryScore);
    const blocked = states.filter((s) => !s.ready).sort((a, b) => a.masteryScore - b.masteryScore);
    const ordered = [...weak, ...fresh, ...mastered, ...blocked];
    // Topic nào là prerequisite còn thiếu của topic bị chặn -> khi gợi ý nó, ghi rõ để mở khóa topic nào.
    const unlocks = new Map<string, string[]>();
    for (const state of states) {
      if (state.ready || !state.unmetPrerequisiteIds.length) continue;
      for (const id of state.unmetPrerequisiteIds) {
        const list = unlocks.get(id) ?? [];
        list.push(state.name);
        unlocks.set(id, list);
      }
    }
    // Topic bị chặn bởi DAG -> gợi ý prerequisite còn thiếu (yếu nhất) thay vì topic đó.
    const seen = new Set<string>();
    const selected: Array<{ state: (typeof states)[number]; blockedBy: string | null }> = [];
    for (const state of ordered) {
      if (selected.length >= 3) break;
      if (state.ready || !state.unmetPrerequisiteIds.length) {
        if (!seen.has(state.topicId)) {
          seen.add(state.topicId);
          selected.push({ state, blockedBy: unlocks.get(state.topicId)?.[0] ?? null });
        }
        continue;
      }
      const candidates = state.unmetPrerequisiteIds
        .map((id) => states.find((s) => s.topicId === id))
        .filter((s): s is (typeof states)[number] => !!s && byId.has(s.topicId) && !seen.has(s.topicId));
      candidates.sort((a, b) => Number(b.isAssessed) - Number(a.isAssessed) || a.masteryScore - b.masteryScore);
      const target = candidates.find((c) => c.ready) ?? candidates[0];
      // Nếu prerequisite đã được chọn rồi thì bỏ qua topic bị chặn, không gợi ý thẳng nó.
      if (target) { seen.add(target.topicId); selected.push({ state: target, blockedBy: state.name }); }
    }
    if (!selected.length) return { userId, minutes, masteryThreshold: threshold, items: [] };
    // Dữ liệu khóa học/bài học: ưu tiên khóa PUBLISHED, khóa đã ghi danh, bài học đầu chưa xong.
    const enrolled = new Set(enrollments.map((e) => e.courseId));
    const completed = new Set(progress.map((p) => p.lessonId));
    const courseIds = [...new Set(courseTopics.map((ct) => ct.course.id))];
    const chapters = courseIds.length ? await this.prisma.chapter.findMany({
      where: { courseId: { in: courseIds } },
      orderBy: [{ order: 'asc' }, { id: 'asc' }],
      select: {
        courseId: true,
        lessons: { orderBy: [{ order: 'asc' }, { id: 'asc' }], select: { id: true, title: true, order: true } },
      },
    }) : [];
    const lessonsByCourse = new Map<string, Array<{ id: string; title: string }>>();
    for (const chapter of chapters) {
      const list = lessonsByCourse.get(chapter.courseId) ?? [];
      for (const lesson of chapter.lessons) list.push({ id: lesson.id, title: lesson.title });
      lessonsByCourse.set(chapter.courseId, list);
    }
    const linksByTopic = new Map<string, typeof courseTopics>();
    for (const ct of courseTopics) {
      const list = linksByTopic.get(ct.topicId) ?? [];
      list.push(ct);
      linksByTopic.set(ct.topicId, list);
    }
    const pickCourse = (topicId: string) => {
      const links = (linksByTopic.get(topicId) ?? []).slice().sort((a, b) => {
        const statusRank = (s: string) => (s === 'PUBLISHED' ? 0 : 1);
        return statusRank(a.course.status) - statusRank(b.course.status)
          || Number(enrolled.has(b.course.id)) - Number(enrolled.has(a.course.id))
          || a.order - b.order;
      });
      return links[0] ?? null;
    };
    const topicMinutes = Math.max(5, Math.floor(minutes / selected.length));
    // Gộp N+1 query câu hỏi từng topic thành 1 đợt Promise.all song song.
    const windows = selected.map(({ state }) => {
      const center = Math.min(1, Math.max(0, (state.masteryScore - 800) / 1200));
      const difficultyMin = Math.max(0, Math.round((center - 0.15) * 100) / 100);
      const difficultyMax = Math.min(1, Math.round((center + 0.15) * 100) / 100);
      const practiceMinutes = Math.max(5, Math.round(topicMinutes * 0.6));
      const questionTake = Math.min(20, Math.max(3, Math.ceil(practiceMinutes * 1.5)));
      return { state, difficultyMin, difficultyMax, practiceMinutes, questionTake };
    });
    const batched = await Promise.all(windows.map((w) => this.prisma.question.findMany({
      where: {
        topicId: w.state.topicId,
        difficulty: { gte: w.difficultyMin, lte: w.difficultyMax },
        answers: { none: { attempt: { userId, status: 'SUBMITTED' } } },
      },
      orderBy: [{ difficulty: 'asc' }, { id: 'asc' }],
      take: w.questionTake,
      select: { id: true },
    })));
    const items: Array<Record<string, unknown>> = [];
    for (let i = 0; i < selected.length; i += 1) {
      const { state, blockedBy } = selected[i];
      // Cửa sổ độ khó vừa sức: rating 800..2000 -> difficulty 0..1, lấy ±0.15 quanh rating hiện tại.
      const { difficultyMin, difficultyMax, practiceMinutes } = windows[i];
      const questions = batched[i];
      const level = state.isAssessed ? ratingToLevel(state.masteryScore) : 'Chưa đánh giá';
      if (questions.length) {
        items.push({
          kind: 'practice',
          topicId: state.topicId,
          topicName: state.name,
          reason: blockedBy
            ? `Cần củng cố '${state.name}' trước khi học '${blockedBy}'.`
            : !state.isAssessed
              ? `Chủ đề '${state.name}' chưa có dữ liệu đánh giá, bắt đầu với câu hỏi vừa sức.`
              : state.isMastered
                ? `Chủ đề '${state.name}' đã đạt (${level}), ôn tập để giữ vững.`
                : `Chủ đề '${state.name}' đang yếu nhất (${level}, Elo ${Math.round(state.masteryScore)}), luyện câu hỏi vừa sức.`,
          estimatedMinutes: practiceMinutes,
          questionIds: questions.map((q) => q.id),
          questionCount: questions.length,
          difficultyMin,
          difficultyMax,
        });
      }
      const link = pickCourse(state.topicId);
      if (link) {
        const nextLesson = (lessonsByCourse.get(link.course.id) ?? []).find((lesson) => !completed.has(lesson.id));
        if (nextLesson && enrolled.has(link.course.id)) {
          items.push({
            kind: 'lesson',
            topicId: state.topicId,
            topicName: state.name,
            reason: blockedBy
              ? `Học tiếp bài '${nextLesson.title}' để mở khóa '${blockedBy}'.`
              : `Bài học tiếp theo của '${state.name}' trong khóa '${link.course.title}'.`,
            estimatedMinutes: Math.max(5, topicMinutes - practiceMinutes),
            course: { id: link.course.id, title: link.course.title },
            lesson: nextLesson,
          });
        } else if (!enrolled.has(link.course.id)) {
          items.push({
            kind: 'enroll',
            topicId: state.topicId,
            topicName: state.name,
            reason: `Đăng ký khóa '${link.course.title}' để học lộ trình '${state.name}'.`,
            estimatedMinutes: 5,
            course: { id: link.course.id, title: link.course.title },
          });
        }
      }
    }
    // Quy tắc spec: luôn trả ít nhất 3 gợi ý có lý do.
    // Mục bù không gợi ý thẳng topic bị DAG chặn: ưu tiên prerequisite còn thiếu của nó.
    if (items.length < 3) {
      const picked = new Set(items.map((item) => item.topicId as string));
      for (const state of ordered) {
        if (items.length >= 3) break;
        if (picked.has(state.topicId)) continue;
        const missing = state.unmetPrerequisiteIds
          .map((id) => states.find((s) => s.topicId === id))
          .filter((s): s is (typeof states)[number] => !!s && !picked.has(s.topicId));
        const fallback = (!state.ready && missing.length ? missing[0] : null) ?? (!state.ready ? null : state);
        const target = fallback ?? missing[0];
        if (!target) continue;
        picked.add(target.topicId);
        items.push({
          kind: 'practice',
          topicId: target.topicId,
          topicName: target.name,
          reason: target.topicId === state.topicId
            ? `Bổ sung '${target.name}' để đủ lộ trình học (${target.isAssessed ? `Elo ${Math.round(target.masteryScore)}` : 'chưa đánh giá'}).`
            : `Cần củng cố '${target.name}' trước khi học '${state.name}'.`,
          estimatedMinutes: 5,
          questionIds: [],
          questionCount: 0,
        });
      }
    }
    return { userId, minutes, masteryThreshold: threshold, items };
  }

  /** Chi tiết gợi ý cho 1 chủ đề: profile mastery + prerequisite + câu hỏi vừa sức + bài học tiếp theo. */
  async getRecommendationDetail(userId: string, topicId: string, query: RecommendationsQueryDto = new RecommendationsQueryDto()) {
    await this.assertStudent(userId);
    const topic = await this.prisma.topic.findUnique({ where: { id: topicId }, select: { id: true, name: true } });
    if (!topic) throw new NotFoundException('Không tìm thấy chủ đề');
    const minutes = query.minutes ?? 30;
    const threshold = query.masteryThreshold ?? 1300;
    const [scores, edges] = await Promise.all([
      this.prisma.topicMastery.findMany({ where: { userId } }),
      this.prisma.topicPrerequisite.findMany({ select: { topicId: true, prerequisiteId: true } }),
    ]);
    const byTopic = new Map(scores.map((score) => [score.topicId, score]));
    const graph = prerequisiteMap(edges);
    const ancestors = prerequisiteAncestors(graph, topicId);
    const score = byTopic.get(topicId);
    const attempts = score?.attempts ?? 0;
    const masteryScore = score?.masteryScore ?? INITIAL_RATING;
    const unmet = ancestors.filter(({ id }) => {
      const parent = byTopic.get(id);
      return !parent || parent.attempts === 0 || parent.masteryScore < threshold;
    });
    const unmetTopics = unmet.length
      ? await this.prisma.topic.findMany({ where: { id: { in: unmet.map(({ id }) => id) } }, select: { id: true, name: true } })
      : [];
    const unmetById = new Map(unmetTopics.map((t) => [t.id, t]));
    const ready = unmet.length === 0 && !(graph.get(topicId) ?? []).includes(topicId);
    const center = Math.min(1, Math.max(0, (masteryScore - 800) / 1200));
    const difficultyMin = Math.max(0, Math.round((center - 0.15) * 100) / 100);
    const difficultyMax = Math.min(1, Math.round((center + 0.15) * 100) / 100);
    const [questions, total] = await Promise.all([
      this.prisma.question.findMany({
        where: {
          topicId,
          difficulty: { gte: difficultyMin, lte: difficultyMax },
          answers: { none: { attempt: { userId, status: 'SUBMITTED' } } },
        },
        orderBy: [{ difficulty: 'asc' }, { id: 'asc' }],
        take: Math.min(20, Math.max(3, Math.ceil(minutes * 1.5))),
        select: { id: true, content: true, difficulty: true },
      }),
      this.prisma.question.count({
        where: {
          topicId,
          difficulty: { gte: difficultyMin, lte: difficultyMax },
          answers: { none: { attempt: { userId, status: 'SUBMITTED' } } },
        },
      }),
    ]);
    return {
      userId,
      topicId: topic.id,
      topicName: topic.name,
      masteryScore,
      evidenceCount: attempts,
      isAssessed: attempts > 0,
      level: attempts > 0 ? ratingToLevel(masteryScore) : 'Chưa đánh giá',
      isMastered: attempts > 0 && masteryScore >= threshold,
      masteryThreshold: threshold,
      ready,
      unmetPrerequisites: unmet.map(({ id, level: depth }) => ({ topicId: id, name: unmetById.get(id)?.name ?? id, depth })),
      reason: !ready && unmetTopics.length
        ? `Cần củng cố ${unmetTopics.map((t) => `'${t.name}'`).join(', ')} trước khi học '${topic.name}'.`
        : attempts === 0
          ? `Chủ đề '${topic.name}' chưa có dữ liệu đánh giá, bắt đầu với câu hỏi vừa sức.`
          : `Luyện '${topic.name}' ở mức Elo ${Math.round(masteryScore)} với câu hỏi vừa sức trong ~${minutes} phút.`,
      estimatedMinutes: minutes,
      difficultyMin,
      difficultyMax,
      questions,
      totalUnseenInWindow: total,
    };
  }

  /** M1/M4 call inside the grading transaction. The client never supplies scores. */
  async updateAfterGrading(tx: Prisma.TransactionClient, attemptId: string) {
    // Lock order is always attempt -> user to serialize both retries and concurrent exams.
    await tx.$queryRaw`SELECT "id" FROM "exam_attempts" WHERE "id" = ${attemptId} FOR UPDATE`;
    const attempt = await tx.examAttempt.findUnique({ where: { id: attemptId }, include: { user: { select: { role: true } } } });
    if (!attempt) throw new NotFoundException('Không tìm thấy bài làm');
    if (attempt.status !== 'SUBMITTED') throw new BadRequestException('Chỉ cập nhật mastery sau khi chấm bài');
    if (!attempt.userId || attempt.user?.role !== Role.STUDENT || attempt.masteryUpdatedAt) return { updated: false, topics: 0 };
    const userId = attempt.userId;
    await tx.$queryRaw`SELECT "id" FROM "users" WHERE "id" = ${userId} FOR UPDATE`;
    const answers = await tx.examAnswer.findMany({
      where: { attemptId }, orderBy: { id: 'asc' },
      select: { selectedOptionIds: true, isCorrect: true, difficultyAtSubmission: true, topicIdAtSubmission: true,
        question: { select: { topicId: true, difficulty: true } } },
    });
    const evidence = answers.filter((answer) => answer.selectedOptionIds.length > 0);
    const topicIds = [...new Set(evidence.map((answer) => answer.topicIdAtSubmission ?? answer.question.topicId))].sort();
    const stored = topicIds.length ? await tx.topicMastery.findMany({ where: { userId, topicId: { in: topicIds } } }) : [];
    const scores = new Map(stored.map((row) => [row.topicId, { masteryScore: row.masteryScore, attempts: row.attempts }]));
    for (const answer of evidence) {
      const topicId = answer.topicIdAtSubmission ?? answer.question.topicId;
      const difficulty = answer.difficultyAtSubmission ?? answer.question.difficulty;
      const previous = scores.get(topicId) ?? { masteryScore: INITIAL_RATING, attempts: 0 };
      if (!Number.isFinite(difficulty) || !Number.isFinite(previous.masteryScore)) {
        throw new BadRequestException('Dữ liệu độ khó hoặc mastery không hợp lệ');
      }
      scores.set(topicId, { masteryScore: updateRating(previous.masteryScore, difficulty, answer.isCorrect), attempts: previous.attempts + 1 });
    }
    for (const topicId of topicIds) {
      const score = scores.get(topicId)!;
      await tx.topicMastery.upsert({ where: { userId_topicId: { userId, topicId } }, create: { userId, topicId, ...score }, update: score });
    }
    await tx.examAttempt.update({ where: { id: attemptId }, data: { masteryUpdatedAt: new Date() } });
    return { updated: true, topics: topicIds.length };
  }
}
