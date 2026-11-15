-- Preserve the question/options seen by a learner even after editing or reseeding.
ALTER TABLE "exam_answers" ADD COLUMN "questionSnapshot" JSONB;

-- Historical truth before this migration cannot be reconstructed. This backfill
-- freezes the current version; new attempts freeze their version when started.
UPDATE "exam_answers" a
SET "questionSnapshot" = jsonb_build_object(
  'id', q."id", 'content', q."content", 'explanation', q."explanation",
  'type', q."type", 'difficulty', q."difficulty", 'topicId', q."topicId",
  'topic', jsonb_build_object('id', t."id", 'name', t."name"),
  'options', COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
      'id', o."id", 'content', o."content", 'isCorrect', o."isCorrect", 'order', o."order"
    ) ORDER BY o."order", o."id")
    FROM "question_options" o WHERE o."questionId" = q."id"
  ), '[]'::jsonb)
)
FROM "questions" q JOIN "topics" t ON t."id" = q."topicId"
WHERE a."questionId" = q."id";

CREATE UNIQUE INDEX "question_options_questionId_order_key" ON "question_options"("questionId", "order");
CREATE INDEX "exam_questions_questionId_idx" ON "exam_questions"("questionId");
ALTER TABLE "exam_questions" ADD COLUMN "order" INTEGER NOT NULL DEFAULT 0;
CREATE INDEX "exam_questions_examId_order_idx" ON "exam_questions"("examId", "order");

-- NOT VALID allows legacy databases to migrate without guessing a scale.
-- All new/updated rows must meet the [0,1] contract. The audit reports old rows.
ALTER TABLE "questions" ADD CONSTRAINT "questions_difficulty_range"
  CHECK ("difficulty" >= 0 AND "difficulty" <= 1) NOT VALID;
ALTER TABLE "exam_answers" ADD CONSTRAINT "exam_answers_difficulty_range"
  CHECK ("difficultyAtSubmission" >= 0 AND "difficultyAtSubmission" <= 1) NOT VALID;
