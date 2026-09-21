import type {
  Client,
  MaintenancePlan,
  DietPlan,
  MacroDayTemplate,
  WeekdayAssignment,
  CheckIn
} from "@prisma/client";

export type WeekdayAssignmentWithTemplate = WeekdayAssignment & { template: MacroDayTemplate };

export interface FullClient extends Client {
  maintenancePlans: MaintenancePlan[];
  dietPlans: DietPlan[];
  macroDayTemplates: MacroDayTemplate[];
  weekdayAssignments: WeekdayAssignmentWithTemplate[];
  checkIns: CheckIn[];
}

export type {
  Client,
  MaintenancePlan,
  DietPlan,
  MacroDayTemplate,
  WeekdayAssignment,
  CheckIn
};
