/* eslint-disable no-console */
// Synthetic sample clients for exploring the app. None of this is real
// client data. Run with: npm run seed
import { PrismaClient } from "@prisma/client";
import { calculateRestingEnergy, calculateTdee, ACTIVITY_MULTIPLIERS } from "../src/lib/calculations/energy";
import { oneLbPerWeekScenario, computeDeficit } from "../src/lib/calculations/deficit";

const prisma = new PrismaClient();

function daysAgo(n: number): Date {
  const d = new Date();
  d.setUTCHours(6, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - n);
  return d;
}

async function seedFatLossClient() {
  const client = await prisma.client.create({
    data: {
      name: "Sam Whitfield (sample)",
      sex: "MALE",
      age: 34,
      heightCm: 178,
      currentWeightKg: 92.4,
      preferredUnits: "METRIC",
      goal: "FAT_LOSS",
      targetWeightKg: 85,
      targetDate: new Date(new Date().setMonth(new Date().getMonth() + 4)),
      occupation: "Office-based project manager",
      generalActivityLevel: "LIGHTLY_ACTIVE",
      avgDailySteps: 7000,
      resistanceFreqPerWk: 4,
      resistanceSessionMin: 60,
      cardioType: "Incline treadmill walking",
      cardioFreqPerWk: 2,
      cardioSessionMin: 30,
      currentCalorieIntake: 2800,
      currentProteinG: 160,
      currentFatG: 90,
      currentCarbG: 320,
      dietHistoryNotes: "Two previous diet attempts, both regained within 3 months. Reports better adherence with higher-carb training days.",
      coachNotes: "No medications reported. No relevant medical history disclosed at intake."
    }
  });

  const resting = calculateRestingEnergy("MIFFLIN_ST_JEOR", {
    sex: "MALE",
    weightKg: client.currentWeightKg,
    heightCm: client.heightCm,
    age: client.age
  });
  const multiplier = ACTIVITY_MULTIPLIERS.LIGHTLY_ACTIVE.multiplier;
  const tdee = calculateTdee(resting, multiplier);

  await prisma.maintenancePlan.create({
    data: {
      clientId: client.id,
      method: "MIFFLIN_ST_JEOR",
      activityMultiplier: multiplier,
      multiplierLabel: `${ACTIVITY_MULTIPLIERS.LIGHTLY_ACTIVE.label} (${multiplier}x)`,
      calculatedRestingKcal: resting.restingKcal,
      calculatedTdeeKcal: tdee.tdeeKcal,
      changeType: "INITIAL"
    }
  });

  const scenario = oneLbPerWeekScenario(tdee.tdeeKcal, client.currentWeightKg, resting.restingKcal);
  await prisma.dietPlan.create({
    data: {
      clientId: client.id,
      targetMode: "ONE_LB_PER_WEEK_SCENARIO",
      maintenanceKcalUsed: scenario.maintenanceKcalUsed,
      bodyWeightKgUsed: scenario.bodyWeightKgUsed,
      dailyTargetKcal: scenario.dailyTargetKcal,
      weeklyTargetKcal: scenario.weeklyTargetKcal,
      dailyDeficitKcal: scenario.dailyDeficitKcal,
      deficitPercentOfTdee: scenario.deficitPercentOfTdee,
      weeklyLossPercentBodyweight: scenario.weeklyLossPercentBodyweight,
      isFlagged: scenario.flags.length > 0,
      flagReasons: JSON.stringify(scenario.flags),
      changeType: "INITIAL",
      reason: "Initial 1 lb/week scenario agreed at intake."
    }
  });

  const training = await prisma.macroDayTemplate.create({
    data: {
      clientId: client.id,
      name: "Training day",
      calorieKcal: Math.round(scenario.dailyTargetKcal * 1.05),
      proteinMode: "g_per_kg",
      proteinValue: 2.2,
      fatMode: "g_per_kg",
      fatValue: 0.8
    }
  });
  const rest = await prisma.macroDayTemplate.create({
    data: {
      clientId: client.id,
      name: "Rest day",
      calorieKcal: Math.round(scenario.dailyTargetKcal * 0.95),
      proteinMode: "g_per_kg",
      proteinValue: 2.2,
      fatMode: "g_per_kg",
      fatValue: 0.9
    }
  });

  const schedule = [training, training, rest, training, training, rest, rest];
  for (let weekday = 0; weekday < 7; weekday++) {
    await prisma.weekdayAssignment.create({
      data: { clientId: client.id, weekday, templateId: schedule[weekday].id }
    });
  }

  // 28 days of check-ins with a gentle downward weight trend and mostly-good adherence.
  let weight = client.currentWeightKg + 1.2;
  for (let i = 27; i >= 0; i--) {
    weight -= 0.045 + (Math.random() - 0.5) * 0.15;
    const isTrainingDay = [0, 1, 3, 4].includes((6 - (i % 7) + 7) % 7);
    await prisma.checkIn.create({
      data: {
        clientId: client.id,
        date: daysAgo(i),
        weightKg: Math.round(weight * 10) / 10,
        actualCalorieIntake: Math.round(scenario.dailyTargetKcal + (Math.random() - 0.5) * 150),
        actualProteinG: 190 + Math.round((Math.random() - 0.5) * 15),
        actualFatG: 75 + Math.round((Math.random() - 0.5) * 10),
        actualCarbG: 200 + Math.round((Math.random() - 0.5) * 30),
        steps: 6500 + Math.round(Math.random() * 2500),
        cardioMinutes: isTrainingDay ? 0 : 30,
        trainingSessionsCompleted: isTrainingDay ? 1 : 0,
        hunger: 2 + Math.round(Math.random() * 2),
        energy: 3 + Math.round(Math.random() * 2),
        sleepHours: 6.5 + Math.random(),
        sleepQuality: 3 + Math.round(Math.random() * 2),
        recovery: 3 + Math.round(Math.random() * 2),
        adherencePercent: 85 + Math.round(Math.random() * 12)
      }
    });
  }

  console.log(`Seeded fat-loss client: ${client.name} (${client.id})`);
}

async function seedContestPrepClient() {
  const client = await prisma.client.create({
    data: {
      name: "Priya Nandan (sample)",
      sex: "FEMALE",
      age: 28,
      heightCm: 165,
      currentWeightKg: 61.5,
      preferredUnits: "METRIC",
      bodyFatPercent: 19,
      bodyFatMethod: "DEXA",
      bodyFatDate: daysAgo(20),
      goal: "CONTEST_PREP",
      isCompetitor: true,
      division: "Bikini",
      showDate: new Date(new Date().setDate(new Date().getDate() + 70)),
      targetWeightKg: 56,
      occupation: "Physiotherapist (on feet most of the day)",
      generalActivityLevel: "MODERATELY_ACTIVE",
      avgDailySteps: 9500,
      resistanceFreqPerWk: 5,
      resistanceSessionMin: 75,
      cardioType: "Stairmaster",
      cardioFreqPerWk: 4,
      cardioSessionMin: 25,
      dietHistoryNotes: "First competition prep. No prior structured dieting history.",
      coachNotes: "Tracks menstrual cycle — expect water-retention swings pre-menstrually. No medications reported."
    }
  });

  const resting = calculateRestingEnergy("LEAN_MASS_KATCH_MCARDLE", {
    sex: "FEMALE",
    weightKg: client.currentWeightKg,
    heightCm: client.heightCm,
    age: client.age,
    bodyFatPercent: client.bodyFatPercent!
  });
  const multiplier = ACTIVITY_MULTIPLIERS.MODERATELY_ACTIVE.multiplier;
  const tdee = calculateTdee(resting, multiplier);

  await prisma.maintenancePlan.create({
    data: {
      clientId: client.id,
      method: "LEAN_MASS_KATCH_MCARDLE",
      activityMultiplier: multiplier,
      multiplierLabel: `${ACTIVITY_MULTIPLIERS.MODERATELY_ACTIVE.label} (${multiplier}x)`,
      calculatedRestingKcal: resting.restingKcal,
      calculatedTdeeKcal: tdee.tdeeKcal,
      changeType: "INITIAL"
    }
  });

  const dietResult = computeDeficit("PERCENT_DEFICIT_FROM_MAINTENANCE", 18, tdee.tdeeKcal, client.currentWeightKg, resting.restingKcal);
  await prisma.dietPlan.create({
    data: {
      clientId: client.id,
      targetMode: "PERCENT_DEFICIT_FROM_MAINTENANCE",
      targetValue: 18,
      maintenanceKcalUsed: dietResult.maintenanceKcalUsed,
      bodyWeightKgUsed: dietResult.bodyWeightKgUsed,
      dailyTargetKcal: dietResult.dailyTargetKcal,
      weeklyTargetKcal: dietResult.weeklyTargetKcal,
      dailyDeficitKcal: dietResult.dailyDeficitKcal,
      deficitPercentOfTdee: dietResult.deficitPercentOfTdee,
      weeklyLossPercentBodyweight: dietResult.weeklyLossPercentBodyweight,
      isFlagged: dietResult.flags.length > 0,
      flagReasons: JSON.stringify(dietResult.flags),
      changeType: "INITIAL",
      reason: "Prep start: moderate 18% deficit given long prep runway."
    }
  });

  let weight = client.currentWeightKg + 0.8;
  for (let i = 20; i >= 0; i--) {
    weight -= 0.03 + (Math.random() - 0.5) * 0.12;
    await prisma.checkIn.create({
      data: {
        clientId: client.id,
        date: daysAgo(i),
        weightKg: Math.round(weight * 10) / 10,
        actualCalorieIntake: Math.round(dietResult.dailyTargetKcal + (Math.random() - 0.5) * 100),
        steps: 9000 + Math.round(Math.random() * 1500),
        cardioMinutes: 25,
        trainingSessionsCompleted: 1,
        hunger: 3,
        energy: 3,
        recovery: 3,
        adherencePercent: 90 + Math.round(Math.random() * 8),
        menstrualCycleNotes: i === 14 ? "Day 1 of cycle — some water retention expected this week." : undefined
      }
    });
  }

  console.log(`Seeded contest-prep client: ${client.name} (${client.id})`);
}

async function main() {
  const existing = await prisma.client.count();
  if (existing > 0) {
    console.log(`Database already has ${existing} client(s) — skipping seed to avoid duplicating sample data.`);
    return;
  }
  await seedFatLossClient();
  await seedContestPrepClient();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
