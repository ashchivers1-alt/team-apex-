-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "name" TEXT NOT NULL,
    "sex" TEXT NOT NULL,
    "age" INTEGER NOT NULL,
    "heightCm" REAL NOT NULL,
    "currentWeightKg" REAL NOT NULL,
    "preferredUnits" TEXT NOT NULL DEFAULT 'METRIC',
    "bodyFatPercent" REAL,
    "bodyFatMethod" TEXT,
    "bodyFatDate" DATETIME,
    "goal" TEXT NOT NULL,
    "targetWeightKg" REAL,
    "targetDate" DATETIME,
    "isCompetitor" BOOLEAN NOT NULL DEFAULT false,
    "division" TEXT,
    "showDate" DATETIME,
    "occupation" TEXT,
    "generalActivityLevel" TEXT,
    "avgDailySteps" INTEGER,
    "resistanceFreqPerWk" INTEGER,
    "resistanceSessionMin" INTEGER,
    "cardioType" TEXT,
    "cardioFreqPerWk" INTEGER,
    "cardioSessionMin" INTEGER,
    "currentCalorieIntake" INTEGER,
    "currentProteinG" REAL,
    "currentFatG" REAL,
    "currentCarbG" REAL,
    "dietHistoryNotes" TEXT,
    "coachNotes" TEXT
);

-- CreateTable
CREATE TABLE "MaintenancePlan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clientId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "method" TEXT NOT NULL DEFAULT 'MIFFLIN_ST_JEOR',
    "activityMultiplier" REAL NOT NULL,
    "multiplierLabel" TEXT NOT NULL,
    "calculatedRestingKcal" REAL NOT NULL,
    "calculatedTdeeKcal" REAL NOT NULL,
    "overrideKcal" REAL,
    "overrideReason" TEXT,
    "overrideDate" DATETIME,
    "changeType" TEXT NOT NULL DEFAULT 'INITIAL',
    "notes" TEXT,
    CONSTRAINT "MaintenancePlan_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DietPlan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clientId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "targetMode" TEXT NOT NULL,
    "targetValue" REAL,
    "maintenanceKcalUsed" REAL NOT NULL,
    "bodyWeightKgUsed" REAL NOT NULL,
    "dailyTargetKcal" REAL NOT NULL,
    "weeklyTargetKcal" REAL NOT NULL,
    "dailyDeficitKcal" REAL NOT NULL,
    "deficitPercentOfTdee" REAL NOT NULL,
    "weeklyLossPercentBodyweight" REAL NOT NULL,
    "isFlagged" BOOLEAN NOT NULL DEFAULT false,
    "flagReasons" TEXT,
    "changeType" TEXT NOT NULL DEFAULT 'INITIAL',
    "reason" TEXT,
    CONSTRAINT "DietPlan_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MacroDayTemplate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clientId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "name" TEXT NOT NULL,
    "calorieKcal" REAL NOT NULL,
    "proteinMode" TEXT NOT NULL,
    "proteinValue" REAL NOT NULL,
    "fatMode" TEXT NOT NULL,
    "fatValue" REAL NOT NULL,
    "carbOverrideG" REAL,
    CONSTRAINT "MacroDayTemplate_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WeekdayAssignment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clientId" TEXT NOT NULL,
    "weekday" INTEGER NOT NULL,
    "templateId" TEXT NOT NULL,
    CONSTRAINT "WeekdayAssignment_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "WeekdayAssignment_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "MacroDayTemplate" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CheckIn" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clientId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "weightKg" REAL,
    "actualCalorieIntake" INTEGER,
    "actualProteinG" REAL,
    "actualFatG" REAL,
    "actualCarbG" REAL,
    "steps" INTEGER,
    "cardioMinutes" INTEGER,
    "cardioTypeNote" TEXT,
    "trainingSessionsCompleted" INTEGER,
    "trainingPerformanceNotes" TEXT,
    "hunger" INTEGER,
    "energy" INTEGER,
    "sleepHours" REAL,
    "sleepQuality" INTEGER,
    "recovery" INTEGER,
    "digestionNotes" TEXT,
    "menstrualCycleNotes" TEXT,
    "adherencePercent" INTEGER,
    "coachComment" TEXT,
    "clientComment" TEXT,
    CONSTRAINT "CheckIn_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE CASCADE ON UPDATE CASCADE
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
