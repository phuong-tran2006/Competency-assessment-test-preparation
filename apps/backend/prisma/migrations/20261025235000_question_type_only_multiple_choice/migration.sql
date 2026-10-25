UPDATE "questions"
SET "type" = 'MULTIPLE_CHOICE'
WHERE "type" IN ('TRUE_FALSE', 'FILL_IN_THE_BLANK');

WITH ranked AS (
  SELECT
    qo."id",
    ROW_NUMBER() OVER (
      PARTITION BY qo."questionId"
      ORDER BY qo."order", qo."id"
    ) AS rn
  FROM "question_options" qo
  WHERE qo."isCorrect" = true
)
UPDATE "question_options" qo
SET "isCorrect" = false
FROM ranked r
WHERE qo."id" = r."id" AND r.rn > 1;

ALTER TABLE "questions" ALTER COLUMN "type" DROP DEFAULT;

ALTER TYPE "QuestionType" RENAME TO "QuestionType_old";
CREATE TYPE "QuestionType" AS ENUM ('MULTIPLE_CHOICE');
ALTER TABLE "questions"
  ALTER COLUMN "type" TYPE "QuestionType"
  USING ("type"::text::"QuestionType");
ALTER TABLE "questions"
  ALTER COLUMN "type" SET DEFAULT 'MULTIPLE_CHOICE';
DROP TYPE "QuestionType_old";
