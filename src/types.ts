// ── Data Model Types ──

export interface ChecklistItem {
  text: string;
  done: boolean;
}

export interface LogEntry {
  timestamp: string;
  author: string;
  body: string;
}

// ── Issue ──

export interface IssueFrontmatter {
  id: string;
  title: string;
  type: string;
  status: string;
  priority: string;
  labels: string[];
  assignee: string | null;
  milestone: string | null;
  estimate: number | null;
  spent: number | null;
  dueDate: string | null;
  blockedBy: string[];
  parent: string | null;
  relatedTo: string[];
  checklist: ChecklistItem[];
  log: LogEntry[];
  createdAt: string;
  updatedAt: string;
}

export interface IssueComputedFields {
  blocks: string[];
  children: string[];
  checklistTotal: number;
  checklistChecked: number;
  checklistProgress: number | null;
}

export interface Issue extends IssueFrontmatter, IssueComputedFields {
  filePath: string;
  content?: string;
}

// ── Milestone ──

export interface MilestoneFrontmatter {
  id: string;
  title: string;
  status: string;
  priority: string;
  labels: string[];
  startDate: string | null;
  dueDate: string | null;
  checklist: ChecklistItem[];
  log: LogEntry[];
  createdAt: string;
  updatedAt: string;
}

export interface MilestoneComputedFields {
  totalIssues: number;
  completedIssues: number;
  completionPercentage: number;
  statusBreakdown: Record<string, number>;
  estimateTotal: number;
  estimateCompleted: number;
  spentTotal: number;
  isOverdue: boolean;
  checklistTotal: number;
  checklistChecked: number;
  checklistProgress: number | null;
}

export interface Milestone extends MilestoneFrontmatter, MilestoneComputedFields {
  filePath: string;
  content?: string;
}

// ── Configuration ──

export interface StatusConfig {
  name: string;
}

export interface PriorityConfig {
  name: string;
  description: string;
}

export interface LabelConfig {
  name: string;
  description: string;
}

export interface TypeConfig {
  name: string;
  description: string;
}

export interface IssueConfig {
  prefix: string;
  statuses: StatusConfig[];
  priorities: PriorityConfig[];
  labels: LabelConfig[];
  types: TypeConfig[];
}

export interface MilestoneConfig {
  prefix: string;
  statuses: StatusConfig[];
  priorities: PriorityConfig[];
  labels: LabelConfig[];
}

export interface ProjectConfig {
  issues: IssueConfig;
  milestones: MilestoneConfig;
}

// ── Settings Hierarchy ──

export interface RegisteredProject {
  path: string;
  tags: string[];
}

export interface GlobalConfigDefaults {
  preset?: string;
  format?: "json" | "table";
}

export interface GlobalConfig {
  projects?: RegisteredProject[];
  presets?: Record<string, ProjectConfig>;
  defaults?: GlobalConfigDefaults;
}

// ── Output ──

export type OutputFormat = "json" | "table";

export interface SuccessEnvelope<T> {
  ok: true;
  data: T;
  warnings?: string[];
}

export interface ErrorEnvelope {
  ok: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

export type Envelope<T> = SuccessEnvelope<T> | ErrorEnvelope;
