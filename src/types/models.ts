import type {
  Client,
  MaintenancePlan,
  DietPlan,
  MacroDayTemplate,
  WeekdayAssignment,
  CheckIn,
  MacroChangeLog
} from "@prisma/client";

export type WeekdayAssignmentWithTemplate = WeekdayAssignment & { template: MacroDayTemplate };

export interface FullClient extends Client {
  maintenancePlans: MaintenancePlan[];
  dietPlans: DietPlan[];
  macroDayTemplates: MacroDayTemplate[];
  weekdayAssignments: WeekdayAssignmentWithTemplate[];
  checkIns: CheckIn[];
  macroChangeLogs: MacroChangeLog[];
}

export type {
  Client,
  MaintenancePlan,
  DietPlan,
  MacroDayTemplate,
  WeekdayAssignment,
  CheckIn,
  MacroChangeLog
};
