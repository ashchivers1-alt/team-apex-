-- AlterTable
ALTER TABLE "CheckIn" ADD COLUMN     "planChangeNotes" TEXT,
ADD COLUMN     "reportedAverageWeightKg" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "Client" ADD COLUMN     "checkInDays" INTEGER[] DEFAULT ARRAY[]::INTEGER[];
