UPDATE "materials" SET "type" = 'LINK' WHERE "type" = 'VIDEO';

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

UPDATE "questions"
SET "type" = 'MULTIPLE_CHOICE'
WHERE "type" = 'MULTI_SELECT';

ALTER TABLE "questions" ALTER COLUMN "type" DROP DEFAULT;

ALTER TYPE "QuestionType" RENAME TO "QuestionType_old";
CREATE TYPE "QuestionType" AS ENUM (
  'MULTIPLE_CHOICE',
  'TRUE_FALSE',
  'FILL_IN_THE_BLANK'
);
ALTER TABLE "questions"
  ALTER COLUMN "type" TYPE "QuestionType"
  USING ("type"::text::"QuestionType");
ALTER TABLE "questions"
  ALTER COLUMN "type" SET DEFAULT 'MULTIPLE_CHOICE';
DROP TYPE "QuestionType_old";

ALTER TYPE "MaterialType" RENAME TO "MaterialType_old";
CREATE TYPE "MaterialType" AS ENUM ('TEXT', 'PDF', 'LINK');
ALTER TABLE "materials"
  ALTER COLUMN "type" TYPE "MaterialType"
  USING ("type"::text::"MaterialType");
DROP TYPE "MaterialType_old";
