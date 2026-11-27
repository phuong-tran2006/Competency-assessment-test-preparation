BEGIN;

-- Rename the existing score instead of dropping/recreating mastery records.
ALTER TABLE "topic_masteries" RENAME COLUMN "rating" TO "masteryScore";
ALTER TABLE "topic_masteries" ADD CONSTRAINT "topic_masteries_score_finite"
  CHECK ("masteryScore" > '-Infinity'::float8 AND "masteryScore" < 'Infinity'::float8);
ALTER TABLE "topic_masteries" ADD CONSTRAINT "topic_masteries_attempts_nonnegative"
  CHECK ("attempts" >= 0);

ALTER TABLE "exam_attempts" ADD COLUMN "masteryUpdatedAt" TIMESTAMP(3);
ALTER TABLE "exam_answers" ADD COLUMN "difficultyAtSubmission" DOUBLE PRECISION;
ALTER TABLE "exam_answers" ADD COLUMN "topicIdAtSubmission" TEXT;

-- Historical answers use current question metadata as their initial snapshot.
-- Future submissions save the metadata used for grading atomically.
UPDATE "exam_answers" a
SET "difficultyAtSubmission" = q."difficulty", "topicIdAtSubmission" = q."topicId"
FROM "questions" q, "exam_attempts" e
WHERE a."questionId" = q."id" AND a."attemptId" = e."id" AND e."status" = 'SUBMITTED';

ALTER TABLE "exam_answers" ADD CONSTRAINT "exam_answers_topicIdAtSubmission_fkey"
  FOREIGN KEY ("topicIdAtSubmission") REFERENCES "topics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "exam_answers_questionId_attemptId_idx" ON "exam_answers"("questionId", "attemptId");
CREATE INDEX "exam_answers_topicIdAtSubmission_attemptId_idx" ON "exam_answers"("topicIdAtSubmission", "attemptId");
ALTER TABLE "topic_prerequisites" ADD CONSTRAINT "topic_prerequisites_no_self_reference"
  CHECK ("topicId" <> "prerequisiteId");

COMMIT;
