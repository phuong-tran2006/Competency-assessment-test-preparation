DELETE FROM "materials" WHERE "type" = 'LINK';

ALTER TYPE "MaterialType" RENAME TO "MaterialType_old";
CREATE TYPE "MaterialType" AS ENUM ('TEXT', 'PDF');
ALTER TABLE "materials"
  ALTER COLUMN "type" TYPE "MaterialType"
  USING ("type"::text::"MaterialType");
DROP TYPE "MaterialType_old";
