-- AlterTable
ALTER TABLE "branches" ADD COLUMN     "created_by" UUID,
ALTER COLUMN "city" DROP NOT NULL,
ALTER COLUMN "city_ar" DROP NOT NULL,
ALTER COLUMN "region" DROP NOT NULL,
ALTER COLUMN "region_ar" DROP NOT NULL;

-- AlterTable
ALTER TABLE "customers" ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'active',
ALTER COLUMN "full_name_ar" DROP NOT NULL;

-- AlterTable
ALTER TABLE "vehicles" ALTER COLUMN "make" DROP NOT NULL,
ALTER COLUMN "model" DROP NOT NULL,
ALTER COLUMN "year" DROP NOT NULL,
ALTER COLUMN "color" DROP NOT NULL,
ALTER COLUMN "color_ar" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "branches" ADD CONSTRAINT "branches_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
