import type { Issue, ChecklistItem } from "../types.ts";
import type { RawIssue } from "./issue-reader.ts";

export function computeChecklistStats(checklist: ChecklistItem[]): {
  checklistTotal: number;
  checklistChecked: number;
  checklistProgress: number | null;
} {
  const total = checklist.length;
  const checked = checklist.filter((c) => c.done).length;
  const progress = total > 0 ? Math.round((checked / total) * 100) : null;
  return { checklistTotal: total, checklistChecked: checked, checklistProgress: progress };
}

export function computeIssueRelations(
  issue: RawIssue,
  allIssues: RawIssue[],
): { blocks: string[]; children: string[] } {
  const blocks = allIssues
    .filter((other) => other.blockedBy.includes(issue.id))
    .map((other) => other.id);

  const children = allIssues
    .filter((other) => other.parent === issue.id)
    .map((other) => other.id);

  return { blocks, children };
}

export function enrichIssue(raw: RawIssue, allIssues: RawIssue[], includeContent: boolean = false): Issue {
  const { blocks, children } = computeIssueRelations(raw, allIssues);
  const { checklistTotal, checklistChecked, checklistProgress } = computeChecklistStats(raw.checklist);

  const issue: Issue = {
    id: raw.id,
    title: raw.title,
    type: raw.type,
    status: raw.status,
    priority: raw.priority,
    labels: raw.labels,
    assignee: raw.assignee,
    milestone: raw.milestone,
    estimate: raw.estimate,
    spent: raw.spent,
    dueDate: raw.dueDate,
    blockedBy: raw.blockedBy,
    parent: raw.parent,
    relatedTo: raw.relatedTo,
    checklist: raw.checklist,
    log: raw.log,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
    blocks,
    children,
    checklistTotal,
    checklistChecked,
    checklistProgress,
    filePath: raw.filePath,
  };

  if (includeContent) {
    issue.content = raw.content;
  }

  return issue;
}

// ── Filtering ──

export interface IssueFilters {
  status?: string[];
  type?: string[];
  priority?: string;
  labels?: string[];
  assignee?: string;
  milestone?: string;
  blocked?: boolean;
  parent?: string;
  createdAfter?: string;
  createdBefore?: string;
  dueAfter?: string;
  dueBefore?: string;
}

export function filterIssues(issues: Issue[], filters: IssueFilters): Issue[] {
  return issues.filter((issue) => {
    if (filters.status && filters.status.length > 0) {
      if (!filters.status.some((s) => s.toLowerCase() === issue.status.toLowerCase())) {
        return false;
      }
    }

    if (filters.type && filters.type.length > 0) {
      if (!issue.type || !filters.type.some((t) => t.toLowerCase() === issue.type!.toLowerCase())) {
        return false;
      }
    }

    if (filters.priority !== undefined) {
      if (!issue.priority || issue.priority.toLowerCase() !== filters.priority.toLowerCase()) {
        return false;
      }
    }

    if (filters.labels && filters.labels.length > 0) {
      const hasLabel = filters.labels.some((fl) =>
        issue.labels.some((il) => il.toLowerCase() === fl.toLowerCase()),
      );
      if (!hasLabel) return false;
    }

    if (filters.assignee !== undefined) {
      if (filters.assignee.toLowerCase() === "none") {
        if (issue.assignee !== null) return false;
      } else {
        if (issue.assignee?.toLowerCase() !== filters.assignee.toLowerCase()) return false;
      }
    }

    if (filters.milestone !== undefined) {
      if (filters.milestone.toLowerCase() === "none") {
        if (issue.milestone !== null) return false;
      } else {
        if (issue.milestone?.toLowerCase() !== filters.milestone.toLowerCase()) return false;
      }
    }

    if (filters.blocked !== undefined) {
      const isBlocked = issue.blockedBy.length > 0;
      if (filters.blocked !== isBlocked) return false;
    }

    if (filters.parent !== undefined) {
      if (filters.parent.toLowerCase() === "none") {
        if (issue.parent !== null) return false;
      } else {
        if (issue.parent?.toLowerCase() !== filters.parent.toLowerCase()) return false;
      }
    }

    if (filters.createdAfter) {
      if (issue.createdAt < filters.createdAfter) return false;
    }

    if (filters.createdBefore) {
      if (issue.createdAt > filters.createdBefore + "T23:59:59.999Z") return false;
    }

    if (filters.dueAfter) {
      if (!issue.dueDate || issue.dueDate < filters.dueAfter) return false;
    }

    if (filters.dueBefore) {
      if (!issue.dueDate || issue.dueDate > filters.dueBefore) return false;
    }

    return true;
  });
}

// ── Sorting ──

type SortField = "id" | "title" | "status" | "priority" | "type" | "created" | "updated" | "estimate" | "spent" | "dueDate";

export function sortIssues(issues: Issue[], field: SortField = "id", order: "asc" | "desc" = "asc"): Issue[] {
  const sorted = [...issues].sort((a, b) => {
    let cmp = 0;
    switch (field) {
      case "id":
        cmp = a.id.localeCompare(b.id);
        break;
      case "title":
        cmp = a.title.localeCompare(b.title);
        break;
      case "status":
        cmp = a.status.localeCompare(b.status);
        break;
      case "priority":
        cmp = (a.priority ?? "").localeCompare(b.priority ?? "");
        break;
      case "type":
        cmp = (a.type ?? "").localeCompare(b.type ?? "");
        break;
      case "created":
        cmp = a.createdAt.localeCompare(b.createdAt);
        break;
      case "updated":
        cmp = a.updatedAt.localeCompare(b.updatedAt);
        break;
      case "estimate":
        cmp = (a.estimate ?? 0) - (b.estimate ?? 0);
        break;
      case "spent":
        cmp = (a.spent ?? 0) - (b.spent ?? 0);
        break;
      case "dueDate":
        cmp = (a.dueDate ?? "").localeCompare(b.dueDate ?? "");
        break;
    }
    return cmp;
  });

  if (order === "desc") sorted.reverse();
  return sorted;
}
