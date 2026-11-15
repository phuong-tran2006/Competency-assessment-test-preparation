BEGIN;

-- Preserve existing accounts and their relations while unifying the student role.
UPDATE "users" SET "role" = 'STUDENT' WHERE "role" = 'LEARNER';

-- PostgreSQL enums must be recreated to remove an obsolete value.
CREATE TYPE "Role_new" AS ENUM ('STUDENT', 'INSTRUCTOR', 'ADMIN');
ALTER TABLE "users" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "users" ALTER COLUMN "role" TYPE "Role_new"
  USING ("role"::text::"Role_new");
ALTER TYPE "Role" RENAME TO "Role_old";
ALTER TYPE "Role_new" RENAME TO "Role";
DROP TYPE "Role_old";
ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'STUDENT';

COMMIT;
