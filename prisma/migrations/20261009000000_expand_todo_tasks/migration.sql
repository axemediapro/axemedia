ALTER TABLE "TodoTask" ADD COLUMN "category" TEXT;
ALTER TABLE "TodoTask" ADD COLUMN "createdById" INTEGER REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TodoTask" ADD COLUMN "assignedToId" INTEGER REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TodoTask" ADD COLUMN "completedAt" TIMESTAMP(3);

UPDATE "TodoTask"
SET "completedAt" = "updatedAt"
WHERE "status" = 'done' AND "completedAt" IS NULL;

CREATE INDEX "TodoTask_status_dueDate_idx" ON "TodoTask"("status", "dueDate");
CREATE INDEX "TodoTask_createdById_idx" ON "TodoTask"("createdById");
CREATE INDEX "TodoTask_assignedToId_idx" ON "TodoTask"("assignedToId");
CREATE INDEX "TodoTask_clientId_idx" ON "TodoTask"("clientId");
