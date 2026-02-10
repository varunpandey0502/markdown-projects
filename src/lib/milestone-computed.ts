import type { Milestone, MilestoneComputedFields, ChecklistItem } from "../types.ts";
import type { RawMilestone } from "./milestone-reader.ts";
import type { RawIssue } from "./issue-reader.ts";
import { getDoneStatuses } from "./config.ts";
import type { PresetConfig } from "../types.ts";

export function computeMilestoneProgress(
  milestone: RawMilestone,
  allIssues: RawIssue[],
  config: PresetConfig,
): MilestoneComputedFields {
  const assignedIssues = allIssues.filter(
    (i) => i.milestone?.toLowerCase() === milestone.id.toLowerCase(),
  );

  const doneStatuses = getDoneStatuses(config).map((s) => s.toLowerCase());

  const totalIssues = assignedIssues.length;
  const completedIssues = assignedIssues.filter((i) =>
    doneStatuses.includes(i.status.toLowerCase()),
  ).length;
  const completionPercentage = totalIssues > 0 ? Math.round((completedIssues / totalIssues) * 100) : 0;

  // Status breakdown
  const statusBreakdown: Record<string, number> = {};
  for (const issue of assignedIssues) {
    statusBreakdown[issue.status] = (statusBreakdown[issue.status] ?? 0) + 1;
  }

  // Estimate / spent totals
  const estimateTotal = assignedIssues.reduce((sum, i) => sum + (i.estimate ?? 0), 0);
  const estimateCompleted = assignedIssues
    .filter((i) => doneStatuses.includes(i.status.toLowerCase()))
    .reduce((sum, i) => sum + (i.estimate ?? 0), 0);
  const spentTotal = assignedIssues.reduce((sum, i) => sum + (i.spent ?? 0), 0);

  // Overdue
  const isOverdue = milestone.dueDate
    ? new Date(milestone.dueDate + "T23:59:59.999Z") < new Date() && completionPercentage < 100
    : false;

  // Checklist stats
  const checklistTotal = milestone.checklist.length;
  const checklistChecked = milestone.checklist.filter((c: ChecklistItem) => c.done).length;
  const checklistProgress = checklistTotal > 0 ? Math.round((checklistChecked / checklistTotal) * 100) : null;

  return {
    totalIssues,
    completedIssues,
    completionPercentage,
    statusBreakdown,
    estimateTotal,
    estimateCompleted,
    spentTotal,
    isOverdue,
    checklistTotal,
    checklistChecked,
    checklistProgress,
  };
}

export function enrichMilestone(
  raw: RawMilestone,
  allIssues: RawIssue[],
  config: PresetConfig,
  includeContent: boolean = false,
): Milestone {
  const computed = computeMilestoneProgress(raw, allIssues, config);

  const milestone: Milestone = {
    id: raw.id,
    title: raw.title,
    status: raw.status,
    priority: raw.priority,
    labels: raw.labels,
    startDate: raw.startDate,
    dueDate: raw.dueDate,
    checklist: raw.checklist,
    log: raw.log,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
    ...computed,
    filePath: raw.filePath,
  };

  if (includeContent) {
    milestone.content = raw.content;
  }

  return milestone;
}
