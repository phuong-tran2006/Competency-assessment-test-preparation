import { Prisma, QuestionType } from '@prisma/client';

export interface SnapshotQuestion {
  id: string;
  content: string;
  explanation: string | null;
  type: QuestionType;
  difficulty: number;
  topicId: string;
  topic: { id: string; name: string };
  options: { id: string; content: string; isCorrect: boolean; order: number }[];
}

export function questionSnapshot(question: SnapshotQuestion): Prisma.InputJsonObject {
  return {
    id: question.id,
    content: question.content,
    explanation: question.explanation,
    type: question.type,
    difficulty: question.difficulty,
    topicId: question.topicId,
    topic: { id: question.topic.id, name: question.topic.name },
    options: question.options.map(({ id, content, isCorrect, order }) => ({
      id, content, isCorrect, order,
    })),
  };
}

/** Nullable only for legacy/manual fixtures. Never expose the raw JSON to clients. */
export function answerQuestion(answer: {
  questionSnapshot?: Prisma.JsonValue | null;
  question: SnapshotQuestion;
}): SnapshotQuestion {
  return answer.questionSnapshot == null
    ? answer.question
    : answer.questionSnapshot as unknown as SnapshotQuestion;
}
