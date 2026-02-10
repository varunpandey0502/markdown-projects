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
  type: string | null;
  status: string;
  priority: string | null;
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
  priority: string | null;
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

// ── Project ──

export type ProjectHealth = "on-track" | "at-risk" | "off-track";

export interface ProjectLogEntry extends LogEntry {
  health?: ProjectHealth;
}

export interface ProjectFrontmatter {
  title: string;
  description?: string;
  instructions?: string;
  health?: ProjectHealth;
  log: ProjectLogEntry[];
  createdAt: string;
  updatedAt: string;
}

export interface ProjectData extends ProjectFrontmatter {
  filePath: string;
  content?: string;
}

// ── Configuration ──

export type IssueStatusCategory = "triage" | "backlog" | "unstarted" | "started" | "completed" | "canceled";
export type MilestoneStatusCategory = "backlog" | "planned" | "in_progress" | "completed" | "canceled";

export interface StatusConfig {
  name: string;
  description: string;
}

export type IssueStatuses = Record<IssueStatusCategory, StatusConfig[]>;
export type MilestoneStatuses = Record<MilestoneStatusCategory, StatusConfig[]>;

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
  statuses: IssueStatuses;
  priorities: PriorityConfig[];
  labels: LabelConfig[];
  types: TypeConfig[];
}

export interface MilestoneConfig {
  prefix: string;
  statuses: MilestoneStatuses;
  priorities: PriorityConfig[];
  labels: LabelConfig[];
}

// PresetConfig = entity config only (used by presets and global config)
export interface PresetConfig {
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
  presets?: Record<string, PresetConfig>;
  defaults?: GlobalConfigDefaults;
  tags?: Record<string, string>;
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
