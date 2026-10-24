-- DropForeignKey
ALTER TABLE "chapters" DROP CONSTRAINT "chapters_courseId_fkey";

-- DropForeignKey
ALTER TABLE "course_prerequisites" DROP CONSTRAINT "course_prerequisites_courseId_fkey";

-- DropForeignKey
ALTER TABLE "course_prerequisites" DROP CONSTRAINT "course_prerequisites_prerequisiteId_fkey";

-- DropForeignKey
ALTER TABLE "course_topics" DROP CONSTRAINT "course_topics_courseId_fkey";

-- DropForeignKey
ALTER TABLE "course_topics" DROP CONSTRAINT "course_topics_topicId_fkey";

-- DropForeignKey
ALTER TABLE "exam_answers" DROP CONSTRAINT "exam_answers_questionId_fkey";

-- DropForeignKey
ALTER TABLE "exam_questions" DROP CONSTRAINT "exam_questions_examId_fkey";

-- DropForeignKey
ALTER TABLE "exam_questions" DROP CONSTRAINT "exam_questions_questionId_fkey";

-- DropForeignKey
ALTER TABLE "lessons" DROP CONSTRAINT "lessons_chapterId_fkey";

-- DropForeignKey
ALTER TABLE "materials" DROP CONSTRAINT "materials_lessonId_fkey";

-- DropForeignKey
ALTER TABLE "question_options" DROP CONSTRAINT "question_options_questionId_fkey";

-- DropForeignKey
ALTER TABLE "topic_prerequisites" DROP CONSTRAINT "topic_prerequisites_prerequisiteId_fkey";

-- DropForeignKey
ALTER TABLE "topic_prerequisites" DROP CONSTRAINT "topic_prerequisites_topicId_fkey";

-- AlterTable
ALTER TABLE "exam_attempts" ADD COLUMN     "deadlineAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "attempt_topic_results" (
    "id" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "topicId" TEXT NOT NULL,
    "correct" INTEGER NOT NULL DEFAULT 0,
    "total" INTEGER NOT NULL DEFAULT 0,
    "weightedScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "timeSpent" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attempt_topic_results_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "attempt_topic_results_attemptId_idx" ON "attempt_topic_results"("attemptId");

-- CreateIndex
CREATE INDEX "attempt_topic_results_topicId_idx" ON "attempt_topic_results"("topicId");

-- CreateIndex
CREATE UNIQUE INDEX "attempt_topic_results_attemptId_topicId_key" ON "attempt_topic_results"("attemptId", "topicId");

-- CreateIndex
CREATE INDEX "exam_attempts_status_deadlineAt_idx" ON "exam_attempts"("status", "deadlineAt");

-- CreateIndex
CREATE INDEX "exam_attempts_userId_status_submittedAt_idx" ON "exam_attempts"("userId", "status", "submittedAt");

-- AddForeignKey
ALTER TABLE "chapters" ADD CONSTRAINT "chapters_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "chapters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "materials" ADD CONSTRAINT "materials_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "lessons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "topic_prerequisites" ADD CONSTRAINT "topic_prerequisites_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "topics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "topic_prerequisites" ADD CONSTRAINT "topic_prerequisites_prerequisiteId_fkey" FOREIGN KEY ("prerequisiteId") REFERENCES "topics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_topics" ADD CONSTRAINT "course_topics_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_topics" ADD CONSTRAINT "course_topics_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "topics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_prerequisites" ADD CONSTRAINT "course_prerequisites_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_prerequisites" ADD CONSTRAINT "course_prerequisites_prerequisiteId_fkey" FOREIGN KEY ("prerequisiteId") REFERENCES "courses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_options" ADD CONSTRAINT "question_options_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "questions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_questions" ADD CONSTRAINT "exam_questions_examId_fkey" FOREIGN KEY ("examId") REFERENCES "exams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_questions" ADD CONSTRAINT "exam_questions_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "questions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_answers" ADD CONSTRAINT "exam_answers_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "questions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attempt_topic_results" ADD CONSTRAINT "attempt_topic_results_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "exam_attempts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attempt_topic_results" ADD CONSTRAINT "attempt_topic_results_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "topics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
