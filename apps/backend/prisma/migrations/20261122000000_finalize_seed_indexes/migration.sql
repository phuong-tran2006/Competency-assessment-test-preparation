BEGIN;

-- Results/analysis load one attempt's answers ordered by id.
CREATE INDEX "exam_answers_attemptId_id_idx" ON "exam_answers"("attemptId", "id");

-- Exam list counts and FK Restrict checks on exams -> attempts.
CREATE INDEX "exam_attempts_examId_idx" ON "exam_attempts"("examId");

-- User/status answer queries already join through
-- exam_attempts_userId_status_submittedAt_idx and the answer attemptId prefix.
-- Keep Restrict foreign keys and all learner data unchanged.

COMMIT;
