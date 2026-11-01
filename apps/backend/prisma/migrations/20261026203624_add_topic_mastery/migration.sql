-- CreateTable
CREATE TABLE "topic_masteries" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "topicId" TEXT NOT NULL,
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 1200,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "topic_masteries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "topic_masteries_userId_idx" ON "topic_masteries"("userId");

-- CreateIndex
CREATE INDEX "topic_masteries_topicId_idx" ON "topic_masteries"("topicId");

-- CreateIndex
CREATE UNIQUE INDEX "topic_masteries_userId_topicId_key" ON "topic_masteries"("userId", "topicId");

-- AddForeignKey
ALTER TABLE "topic_masteries" ADD CONSTRAINT "topic_masteries_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "topic_masteries" ADD CONSTRAINT "topic_masteries_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "topics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
