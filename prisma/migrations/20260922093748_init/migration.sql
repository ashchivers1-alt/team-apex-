-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "name" TEXT NOT NULL,
    "sex" TEXT NOT NULL,
    "age" INTEGER NOT NULL,
    "heightCm" DOUBLE PRECISION NOT NULL,
    "currentWeightKg" DOUBLE PRECISION NOT NULL,
    "preferredUnits" TEXT NOT NULL DEFAULT 'METRIC',
    "bodyFatPercent" DOUBLE PRECISION,
    "bodyFatMethod" TEXT,
    "bodyFatDate" TIMESTAMP(3),
    "goal" TEXT NOT NULL,
    "targetWeightKg" DOUBLE PRECISION,
    "targetDate" TIMESTAMP(3),
    "isCompetitor" BOOLEAN NOT NULL DEFAULT false,
    "division" TEXT,
    "showDate" TIMESTAMP(3),
    "occupation" TEXT,
    "generalActivityLevel" TEXT,
    "avgDailySteps" INTEGER,
    "resistanceFreqPerWk" INTEGER,
    "resistanceSessionMin" INTEGER,
    "cardioType" TEXT,
    "cardioFreqPerWk" INTEGER,
    "cardioSessionMin" INTEGER,
    "currentCalorieIntake" INTEGER,
    "currentProteinG" DOUBLE PRECISION,
    "currentFatG" DOUBLE PRECISION,
    "currentCarbG" DOUBLE PRECISION,
    "dietHistoryNotes" TEXT,
    "coachNotes" TEXT,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaintenancePlan" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "method" TEXT NOT NULL DEFAULT 'MIFFLIN_ST_JEOR',
    "activityMultiplier" DOUBLE PRECISION NOT NULL,
    "multiplierLabel" TEXT NOT NULL,
    "calculatedRestingKcal" DOUBLE PRECISION NOT NULL,
    "calculatedTdeeKcal" DOUBLE PRECISION NOT NULL,
    "overrideKcal" DOUBLE PRECISION,
    "overrideReason" TEXT,
    "overrideDate" TIMESTAMP(3),
    "changeType" TEXT NOT NULL DEFAULT 'INITIAL',
    "notes" TEXT,

    CONSTRAINT "MaintenancePlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DietPlan" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "targetMode" TEXT NOT NULL,
    "targetValue" DOUBLE PRECISION,
    "maintenanceKcalUsed" DOUBLE PRECISION NOT NULL,
    "bodyWeightKgUsed" DOUBLE PRECISION NOT NULL,
    "dailyTargetKcal" DOUBLE PRECISION NOT NULL,
    "weeklyTargetKcal" DOUBLE PRECISION NOT NULL,
    "dailyDeficitKcal" DOUBLE PRECISION NOT NULL,
    "deficitPercentOfTdee" DOUBLE PRECISION NOT NULL,
    "weeklyLossPercentBodyweight" DOUBLE PRECISION NOT NULL,
    "isFlagged" BOOLEAN NOT NULL DEFAULT false,
    "flagReasons" TEXT,
    "changeType" TEXT NOT NULL DEFAULT 'INITIAL',
    "reason" TEXT,

    CONSTRAINT "DietPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MacroDayTemplate" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "calorieKcal" DOUBLE PRECISION NOT NULL,
    "proteinMode" TEXT NOT NULL,
    "proteinValue" DOUBLE PRECISION NOT NULL,
    "fatMode" TEXT NOT NULL,
    "fatValue" DOUBLE PRECISION NOT NULL,
    "carbOverrideG" DOUBLE PRECISION,

    CONSTRAINT "MacroDayTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WeekdayAssignment" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "weekday" INTEGER NOT NULL,
    "templateId" TEXT NOT NULL,

    CONSTRAINT "WeekdayAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CheckIn" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "weightKg" DOUBLE PRECISION,
    "actualCalorieIntake" INTEGER,
    "actualProteinG" DOUBLE PRECISION,
    "actualFatG" DOUBLE PRECISION,
    "actualCarbG" DOUBLE PRECISION,
    "steps" INTEGER,
    "cardioMinutes" INTEGER,
    "cardioTypeNote" TEXT,
    "trainingSessionsCompleted" INTEGER,
    "trainingPerformanceNotes" TEXT,
    "hunger" INTEGER,
    "energy" INTEGER,
    "sleepHours" DOUBLE PRECISION,
    "sleepQuality" INTEGER,
    "recovery" INTEGER,
    "digestionNotes" TEXT,
    "menstrualCycleNotes" TEXT,
    "adherencePercent" INTEGER,
    "coachComment" TEXT,
    "clientComment" TEXT,

    CONSTRAINT "CheckIn_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Client_archived_idx" ON "Client"("archived");

-- CreateIndex
CREATE INDEX "Client_name_idx" ON "Client"("name");

-- CreateIndex
CREATE INDEX "MaintenancePlan_clientId_createdAt_idx" ON "MaintenancePlan"("clientId", "createdAt");

-- CreateIndex
CREATE INDEX "DietPlan_clientId_createdAt_idx" ON "DietPlan"("clientId", "createdAt");

-- CreateIndex
CREATE INDEX "MacroDayTemplate_clientId_idx" ON "MacroDayTemplate"("clientId");

-- CreateIndex
CREATE INDEX "WeekdayAssignment_clientId_idx" ON "WeekdayAssignment"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "WeekdayAssignment_clientId_weekday_key" ON "WeekdayAssignment"("clientId", "weekday");

-- CreateIndex
CREATE INDEX "CheckIn_clientId_date_idx" ON "CheckIn"("clientId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "CheckIn_clientId_date_key" ON "CheckIn"("clientId", "date");

-- AddForeignKey
ALTER TABLE "MaintenancePlan" ADD CONSTRAINT "MaintenancePlan_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DietPlan" ADD CONSTRAINT "DietPlan_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MacroDayTemplate" ADD CONSTRAINT "MacroDayTemplate_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeekdayAssignment" ADD CONSTRAINT "WeekdayAssignment_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeekdayAssignment" ADD CONSTRAINT "WeekdayAssignment_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "MacroDayTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CheckIn" ADD CONSTRAINT "CheckIn_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
