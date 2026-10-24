/*
  Warnings:

  - A unique constraint covering the columns `[attemptId,questionId]` on the table `exam_answers` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "AttemptStatus" AS ENUM ('IN_PROGRESS', 'SUBMITTED');

-- DropForeignKey
ALTER TABLE "exam_answers" DROP CONSTRAINT "exam_answers_attemptId_fkey";

-- DropForeignKey
ALTER TABLE "exam_attempts" DROP CONSTRAINT "exam_attempts_examId_fkey";

-- AlterTable
ALTER TABLE "exam_answers" ADD COLUMN     "timeSpent" INTEGER NOT NULL DEFAULT 0,
ALTER COLUMN "isCorrect" SET DEFAULT false;

-- AlterTable
ALTER TABLE "exam_attempts" ADD COLUMN     "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "status" "AttemptStatus" NOT NULL DEFAULT 'IN_PROGRESS',
ADD COLUMN     "timeLimit" INTEGER,
ADD COLUMN     "weightedScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
ALTER COLUMN "examId" DROP NOT NULL,
ALTER COLUMN "submittedAt" DROP NOT NULL,
ALTER COLUMN "submittedAt" DROP DEFAULT;

-- CreateIndex
CREATE UNIQUE INDEX "exam_answers_attemptId_questionId_key" ON "exam_answers"("attemptId", "questionId");

-- AddForeignKey
ALTER TABLE "exam_attempts" ADD CONSTRAINT "exam_attempts_examId_fkey" FOREIGN KEY ("examId") REFERENCES "exams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_answers" ADD CONSTRAINT "exam_answers_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "exam_attempts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_answers" ADD CONSTRAINT "exam_answers_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
