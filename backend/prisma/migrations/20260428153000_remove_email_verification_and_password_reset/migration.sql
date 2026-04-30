DROP TABLE IF EXISTS "EmailVerificationToken";
DROP TABLE IF EXISTS "PasswordResetToken";
ALTER TABLE "User" DROP COLUMN IF EXISTS "emailVerifiedAt";
