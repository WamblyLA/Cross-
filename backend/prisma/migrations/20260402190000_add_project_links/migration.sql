CREATE TABLE "ProjectLink" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "clientBindingKey" TEXT NOT NULL,
    "localRootLabel" TEXT NOT NULL,
    "lastSyncAt" TIMESTAMP(3),
    "lastSyncDirection" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectLink_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ProjectLink_userId_clientBindingKey_key"
ON "ProjectLink"("userId", "clientBindingKey");

CREATE INDEX "ProjectLink_userId_idx" ON "ProjectLink"("userId");
CREATE INDEX "ProjectLink_projectId_idx" ON "ProjectLink"("projectId");

ALTER TABLE "ProjectLink"
ADD CONSTRAINT "ProjectLink_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProjectLink"
ADD CONSTRAINT "ProjectLink_projectId_fkey"
FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
