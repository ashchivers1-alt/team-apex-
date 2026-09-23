-- CreateTable
CREATE TABLE "MacroChangeLog" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "templateName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "previousCalorieKcal" DOUBLE PRECISION NOT NULL,
    "previousProteinG" DOUBLE PRECISION NOT NULL,
    "previousFatG" DOUBLE PRECISION NOT NULL,
    "previousCarbG" DOUBLE PRECISION NOT NULL,
    "newCalorieKcal" DOUBLE PRECISION NOT NULL,
    "newProteinG" DOUBLE PRECISION NOT NULL,
    "newFatG" DOUBLE PRECISION NOT NULL,
    "newCarbG" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "MacroChangeLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MacroChangeLog_clientId_createdAt_idx" ON "MacroChangeLog"("clientId", "createdAt");

-- AddForeignKey
ALTER TABLE "MacroChangeLog" ADD CONSTRAINT "MacroChangeLog_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
