-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'PROJECT_OWNER_ACTIVITY';

-- AlterTable
ALTER TABLE "Notification"
ADD COLUMN "payload" JSONB;
