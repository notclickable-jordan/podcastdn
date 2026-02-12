-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "JobType" ADD VALUE 'download_url';
ALTER TYPE "JobType" ADD VALUE 'process_upload';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "SourceType" ADD VALUE 'url';
ALTER TYPE "SourceType" ADD VALUE 'file';

-- AlterTable
ALTER TABLE "Episode" ADD COLUMN     "sourceUrl" TEXT;

-- AlterTable
ALTER TABLE "Source" ADD COLUMN     "sourceUrl" TEXT,
ALTER COLUMN "youtubeId" DROP NOT NULL;
