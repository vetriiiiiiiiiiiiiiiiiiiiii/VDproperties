-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "translations" JSONB NOT NULL DEFAULT '{}';

-- AlterTable
ALTER TABLE "Property" ADD COLUMN     "translations" JSONB NOT NULL DEFAULT '{}';

-- AlterTable
ALTER TABLE "SiteSettings" ADD COLUMN     "translations" JSONB NOT NULL DEFAULT '{}';
