import type { ProjectConfig, IssueStatusCategory, MilestoneStatusCategory } from "../types.ts";

const ISSUE_STATUS_CATEGORY_ORDER: IssueStatusCategory[] = [
  "triage", "backlog", "unstarted", "started", "completed", "canceled",
];

const MILESTONE_STATUS_CATEGORY_ORDER: MilestoneStatusCategory[] = [
  "backlog", "planned", "in_progress", "completed", "canceled",
];

export function getDefaultIssueStatus(config: ProjectConfig): string {
  for (const category of ISSUE_STATUS_CATEGORY_ORDER) {
    const statuses = config.issues.statuses[category];
    if (statuses.length > 0) {
      return statuses[0]!.name;
    }
  }
  return "";
}

export function getDefaultMilestoneStatus(config: ProjectConfig): string {
  for (const category of MILESTONE_STATUS_CATEGORY_ORDER) {
    const statuses = config.milestones.statuses[category];
    if (statuses.length > 0) {
      return statuses[0]!.name;
    }
  }
  return "";
}
