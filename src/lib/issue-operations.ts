import { join, dirname, basename } from "node:path";
import { PROJECT_DIR } from "../constants.ts";
import { MdpError } from "../errors.ts";
import { circularDependency } from "../errors.ts";
import { slugify } from "./slug.ts";
import { buildMarkdown, parseMarkdown } from "./frontmatter.ts";
import { ensureDir, writeText, readText, pathExists, renameEntry } from "./fs-utils.ts";
import { findIssueAbsolutePath } from "./issue-reader.ts";
import { detectCycle } from "./cycle-detector.ts";
import { validateStatus, validatePriority, validateType, validateLabels, validateDate, parseCommaSeparated, validateEstimate, validateSpent } from "./validators.ts";
import { getDefaultIssueStatus } from "./config-defaults.ts";
import type { ProjectConfig, ChecklistItem, LogEntry } from "../types.ts";
import type { RawIssue } from "./issue-reader.ts";

// ── Batch output types ──

export interface BatchItemSuccess<T> {
  ok: true;
  data: T;
}

export interface BatchItemError {
  ok: false;
  error: {
    code: string;
    message: string;
    index: number;
    details?: Record<string, unknown>;
  };
}

export type BatchItemResult<T> = BatchItemSuccess<T> | BatchItemError;

export interface BatchEnvelope<T> {
  total: number;
  succeeded: number;
  failed: number;
  results: BatchItemResult<T>[];
}

// ── Create types ──

export interface IssueCreateInput {
  title: string;
  type?: string;
  status?: string;
  priority?: string;
  labels?: string[] | string;
  assignee?: string | null;
  milestone?: string | null;
  estimate?: number | string | null;
  spent?: number | string | null;
  dueDate?: string | null;
  blockedBy?: string[] | string;
  parent?: string | null;
  relatedTo?: string[] | string;
  checklist?: string[] | string;
  description?: string;
  content?: string;
  template?: string;
}

export interface PreparedIssueCreate {
  id: string;
  slug: string;
  folderName: string;
  frontmatter: Record<string, unknown>;
  content: string;
  filePath: string;
  warnings: string[];
}

// ── Update types ──

export interface IssueUpdateInput {
  id: string;
  title?: string;
  type?: string;
  status?: string;
  priority?: string;
  labels?: string[] | string;
  addLabels?: string[] | string;
  removeLabels?: string[] | string;
  assignee?: string | null;
  milestone?: string | null;
  estimate?: number | string | null;
  spent?: number | string | null;
  dueDate?: string | null;
  blockedBy?: string[] | string;
  addBlockedBy?: string[] | string;
  removeBlockedBy?: string[] | string;
  parent?: string | null;
  relatedTo?: string[] | string;
  addRelatedTo?: string[] | string;
  removeRelatedTo?: string[] | string;
  addChecklist?: string[] | string;
  removeChecklist?: string[] | string;
  check?: string[] | string;
  uncheck?: string[] | string;
  content?: string;
}

export interface AppliedIssueUpdate {
  frontmatter: Record<string, unknown>;
  content: string;
  changes: Record<string, { from: unknown; to: unknown }>;
  warnings: string[];
  statusChanged: boolean;
  titleChanged: boolean;
}

// ── Helpers ──

function normalizeStringArray(value: string[] | string | undefined): string[] {
  if (value === undefined) return [];
  if (Array.isArray(value)) return value;
  return parseCommaSeparated(value);
}

function normalizeNumericField(value: number | string | null | undefined): number | null {
  if (value === undefined || value === null) return null;
  if (typeof value === "number") return value;
  if (value === "none") return null;
  const n = Number(value);
  if (isNaN(n)) return null;
  return n;
}

// ── Core create logic ──

export async function prepareIssueCreate(
  input: IssueCreateInput,
  config: ProjectConfig,
  projectPath: string,
  id: string,
): Promise<PreparedIssueCreate> {
  const warnings: string[] = [];

  // Validate fields
  const status = validateStatus(config.issues.statuses, input.status ?? getDefaultIssueStatus(config));
  const priority = input.priority ? validatePriority(config.issues.priorities, input.priority) : null;
  const type = input.type ? validateType(config.issues.types, input.type) : null;

  const labelsRaw = normalizeStringArray(input.labels);
  const labels = validateLabels(config.issues.labels, labelsRaw);

  const estimate = input.estimate !== undefined ? validateEstimate(String(input.estimate)) : null;
  const spent = input.spent !== undefined ? validateSpent(String(input.spent)) : null;
  const dueDate = input.dueDate ? validateDate(input.dueDate) : null;

  const blockedBy = normalizeStringArray(input.blockedBy);
  const relatedTo = normalizeStringArray(input.relatedTo);

  const checklistItems = normalizeStringArray(input.checklist);
  const checklist: ChecklistItem[] = checklistItems.map((text) => ({ text, done: false }));

  const assignee = input.assignee ?? null;
  const milestone = input.milestone ?? null;
  const parent = input.parent ?? null;

  // Handle template
  let templateContent = "";
  let templateFrontmatter: Record<string, unknown> = {};
  if (input.template) {
    const templatePath = join(projectPath, PROJECT_DIR, "templates", `${input.template}.md`);
    if (!(await pathExists(templatePath))) {
      throw new MdpError("TEMPLATE_NOT_FOUND", `Template "${input.template}" not found`, { name: input.template });
    }
    const templateRaw = await readText(templatePath);
    const parsed = parseMarkdown(templateRaw);
    templateFrontmatter = parsed.frontmatter;
    templateContent = parsed.content;
  }

  // Handle content
  let content = "";
  if (input.content) {
    content = input.content;
  } else if (input.description) {
    content = `## Description\n\n${input.description}\n`;
  } else if (templateContent) {
    content = templateContent;
  }

  const slug = slugify(input.title);
  const folderName = `${id}-${slug}`;

  const now = new Date().toISOString();

  const frontmatter: Record<string, unknown> = {
    id,
    title: input.title,
    type: type ?? (templateFrontmatter.type as string | null) ?? null,
    status,
    priority: priority ?? (templateFrontmatter.priority as string | null) ?? null,
    labels: labels.length > 0 ? labels : (templateFrontmatter.labels as string[]) || [],
    assignee: assignee ?? (templateFrontmatter.assignee as string | null) ?? null,
    milestone: milestone ?? (templateFrontmatter.milestone as string | null) ?? null,
    estimate: estimate ?? (templateFrontmatter.estimate as number | null) ?? null,
    spent: spent ?? (templateFrontmatter.spent as number | null) ?? null,
    dueDate: dueDate || (templateFrontmatter.dueDate as string | null) || null,
    blockedBy: blockedBy.length > 0 ? blockedBy : (templateFrontmatter.blockedBy as string[]) || [],
    parent: parent ?? (templateFrontmatter.parent as string | null) ?? null,
    relatedTo: relatedTo.length > 0 ? relatedTo : (templateFrontmatter.relatedTo as string[]) || [],
    checklist: checklist.length > 0 ? checklist : (templateFrontmatter.checklist as ChecklistItem[]) || [],
    log: (templateFrontmatter.log as LogEntry[]) || [],
    createdAt: now,
    updatedAt: now,
  };

  const filePath = `${PROJECT_DIR}/issues/${folderName}/${folderName}.md`;

  return {
    id,
    slug,
    folderName,
    frontmatter,
    content,
    filePath,
    warnings,
  };
}

export async function writeIssueCreate(
  projectPath: string,
  prepared: PreparedIssueCreate,
): Promise<void> {
  const fullDirPath = join(projectPath, PROJECT_DIR, "issues", prepared.folderName);
  await ensureDir(fullDirPath);

  const markdown = buildMarkdown(prepared.frontmatter, prepared.content);
  const fullFilePath = join(fullDirPath, `${prepared.folderName}.md`);
  await writeText(fullFilePath, markdown);
}

// ── Core update logic ──

export function applyIssueUpdate(
  input: IssueUpdateInput,
  rawIssue: RawIssue,
  parsedFm: Record<string, unknown>,
  parsedContent: string,
  config: ProjectConfig,
  allIssues: RawIssue[],
): AppliedIssueUpdate {
  const warnings: string[] = [];
  const fm = { ...parsedFm };
  const changes: Record<string, { from: unknown; to: unknown }> = {};
  let statusChanged = false;
  let titleChanged = false;

  // ── Simple field updates ──
  if (input.title !== undefined) {
    changes.title = { from: fm.title, to: input.title };
    fm.title = input.title;
    titleChanged = true;
  }

  if (input.type !== undefined) {
    const validated = validateType(config.issues.types, input.type);
    changes.type = { from: fm.type, to: validated };
    fm.type = validated;
  }

  if (input.status !== undefined) {
    const validated = validateStatus(config.issues.statuses, input.status);
    changes.status = { from: fm.status, to: validated };
    fm.status = validated;
    statusChanged = true;
  }

  if (input.priority !== undefined) {
    const validated = validatePriority(config.issues.priorities, input.priority);
    changes.priority = { from: fm.priority, to: validated };
    fm.priority = validated;
  }

  if (input.assignee !== undefined) {
    const val = input.assignee === null || (typeof input.assignee === "string" && input.assignee.toLowerCase() === "none") ? null : input.assignee;
    changes.assignee = { from: fm.assignee, to: val };
    fm.assignee = val;
  }

  if (input.milestone !== undefined) {
    const val = input.milestone === null || (typeof input.milestone === "string" && input.milestone.toLowerCase() === "none") ? null : input.milestone;
    changes.milestone = { from: fm.milestone, to: val };
    fm.milestone = val;
  }

  if (input.estimate !== undefined) {
    const val = input.estimate === null ? null : validateEstimate(String(input.estimate));
    changes.estimate = { from: fm.estimate, to: val };
    fm.estimate = val;
  }

  if (input.spent !== undefined) {
    const val = input.spent === null ? null : validateSpent(String(input.spent));
    changes.spent = { from: fm.spent, to: val };
    fm.spent = val;
  }

  if (input.dueDate !== undefined) {
    const val = input.dueDate === null ? null : (validateDate(input.dueDate) || null);
    changes.dueDate = { from: fm.dueDate, to: val };
    fm.dueDate = val;
  }

  if (input.parent !== undefined) {
    const val = input.parent === null || (typeof input.parent === "string" && input.parent.toLowerCase() === "none") ? null : input.parent;
    changes.parent = { from: fm.parent, to: val };
    fm.parent = val;
  }

  // ── Labels (set / add / remove) ──
  let currentLabels = Array.isArray(fm.labels) ? [...(fm.labels as string[])] : [];

  if (input.labels !== undefined) {
    const parsed = normalizeStringArray(input.labels);
    const validated = validateLabels(config.issues.labels, parsed);
    changes.labels = { from: currentLabels, to: validated };
    currentLabels = validated;
  }
  if (input.addLabels !== undefined) {
    const toAdd = normalizeStringArray(input.addLabels);
    const validated = validateLabels(config.issues.labels, toAdd);
    const before = [...currentLabels];
    for (const label of validated) {
      if (!currentLabels.some((l) => l.toLowerCase() === label.toLowerCase())) {
        currentLabels.push(label);
      }
    }
    changes.labels = { from: before, to: currentLabels };
  }
  if (input.removeLabels !== undefined) {
    const toRemove = normalizeStringArray(input.removeLabels).map((s) => s.toLowerCase());
    const before = [...currentLabels];
    currentLabels = currentLabels.filter((l) => !toRemove.includes(l.toLowerCase()));
    changes.labels = { from: before, to: currentLabels };
  }
  fm.labels = currentLabels;

  // ── BlockedBy (set / add / remove) with cycle detection ──
  let currentBlockedBy = Array.isArray(fm.blockedBy) ? [...(fm.blockedBy as string[])] : [];

  if (input.blockedBy !== undefined) {
    currentBlockedBy = normalizeStringArray(input.blockedBy);
  }
  if (input.addBlockedBy !== undefined) {
    const toAdd = normalizeStringArray(input.addBlockedBy);
    for (const dep of toAdd) {
      if (!currentBlockedBy.some((b) => b.toLowerCase() === dep.toLowerCase())) {
        const cycle = detectCycle(rawIssue.id, dep, allIssues);
        if (cycle) {
          throw circularDependency(rawIssue.id, dep, cycle);
        }
        currentBlockedBy.push(dep);
      }
    }
  }
  if (input.removeBlockedBy !== undefined) {
    const toRemove = normalizeStringArray(input.removeBlockedBy).map((s) => s.toLowerCase());
    currentBlockedBy = currentBlockedBy.filter((b) => !toRemove.includes(b.toLowerCase()));
  }
  if (input.blockedBy !== undefined || input.addBlockedBy !== undefined || input.removeBlockedBy !== undefined) {
    changes.blockedBy = { from: fm.blockedBy, to: currentBlockedBy };
  }
  fm.blockedBy = currentBlockedBy;

  // ── RelatedTo (set / add / remove) ──
  let currentRelatedTo = Array.isArray(fm.relatedTo) ? [...(fm.relatedTo as string[])] : [];

  if (input.relatedTo !== undefined) {
    currentRelatedTo = normalizeStringArray(input.relatedTo);
  }
  if (input.addRelatedTo !== undefined) {
    const toAdd = normalizeStringArray(input.addRelatedTo);
    for (const rel of toAdd) {
      if (!currentRelatedTo.some((r) => r.toLowerCase() === rel.toLowerCase())) {
        currentRelatedTo.push(rel);
      }
    }
  }
  if (input.removeRelatedTo !== undefined) {
    const toRemove = normalizeStringArray(input.removeRelatedTo).map((s) => s.toLowerCase());
    currentRelatedTo = currentRelatedTo.filter((r) => !toRemove.includes(r.toLowerCase()));
  }
  if (input.relatedTo !== undefined || input.addRelatedTo !== undefined || input.removeRelatedTo !== undefined) {
    changes.relatedTo = { from: fm.relatedTo, to: currentRelatedTo };
  }
  fm.relatedTo = currentRelatedTo;

  // ── Checklist manipulation ──
  let currentChecklist = Array.isArray(fm.checklist)
    ? (fm.checklist as Array<{ text: string; done: boolean }>).map((c) => ({ ...c }))
    : [];

  if (input.addChecklist !== undefined) {
    const items = normalizeStringArray(input.addChecklist);
    for (const text of items) {
      currentChecklist.push({ text, done: false });
    }
    changes.checklist = { from: "modified", to: `added ${items.length} items` };
  }
  if (input.removeChecklist !== undefined) {
    const toRemove = normalizeStringArray(input.removeChecklist).map((s) => s.toLowerCase());
    const before = currentChecklist.length;
    currentChecklist = currentChecklist.filter((c) => !toRemove.includes(c.text.toLowerCase()));
    changes.checklist = { from: "modified", to: `removed ${before - currentChecklist.length} items` };
  }
  if (input.check !== undefined) {
    const toCheck = normalizeStringArray(input.check).map((s) => s.toLowerCase());
    for (const item of currentChecklist) {
      if (toCheck.includes(item.text.toLowerCase())) {
        item.done = true;
      }
    }
    changes.checklist = { from: "modified", to: `checked ${toCheck.length} items` };
  }
  if (input.uncheck !== undefined) {
    const toUncheck = normalizeStringArray(input.uncheck).map((s) => s.toLowerCase());
    for (const item of currentChecklist) {
      if (toUncheck.includes(item.text.toLowerCase())) {
        item.done = false;
      }
    }
    changes.checklist = { from: "modified", to: `unchecked ${toUncheck.length} items` };
  }
  fm.checklist = currentChecklist;

  // ── Content ──
  let content = parsedContent;
  if (input.content !== undefined) {
    content = input.content;
    changes.content = { from: "(previous)", to: "(updated)" };
  }

  // ── Update timestamp ──
  fm.updatedAt = new Date().toISOString();

  return {
    frontmatter: fm,
    content,
    changes,
    warnings,
    statusChanged,
    titleChanged,
  };
}

export async function writeIssueUpdate(
  projectPath: string,
  rawIssue: RawIssue,
  fm: Record<string, unknown>,
  content: string,
  titleChanged: boolean,
): Promise<{ filePath: string; moved: boolean; oldPath?: string; newPath?: string }> {
  const markdown = buildMarkdown(fm, content);

  if (titleChanged) {
    const newTitle = fm.title as string;
    const currentMdPath = join(projectPath, rawIssue.filePath);
    const currentFolderPath = dirname(currentMdPath);
    const currentFolderName = basename(currentFolderPath);
    const parentDir = dirname(currentFolderPath);

    const newSlug = slugify(newTitle);
    const newFolderName = `${rawIssue.id}-${newSlug}`;
    const newFolderPath = join(parentDir, newFolderName);

    if (currentFolderPath !== newFolderPath) {
      await renameEntry(currentFolderPath, newFolderPath);

      const oldMdName = `${currentFolderName}.md`;
      const newMdFileName = `${newFolderName}.md`;
      if (oldMdName !== newMdFileName) {
        const oldMdInsideNewFolder = join(newFolderPath, oldMdName);
        if (await pathExists(oldMdInsideNewFolder)) {
          await renameEntry(oldMdInsideNewFolder, join(newFolderPath, newMdFileName));
        }
      }

      const newRelativePath = `${PROJECT_DIR}/issues/${newFolderName}/${newFolderName}.md`;
      const newAbsPath = findIssueAbsolutePath(projectPath, newRelativePath);
      await writeText(newAbsPath, markdown);

      return {
        filePath: newRelativePath,
        moved: true,
        oldPath: rawIssue.filePath,
        newPath: newRelativePath,
      };
    }
  }

  // No move needed — write in place
  const absolutePath = findIssueAbsolutePath(projectPath, rawIssue.filePath);
  await writeText(absolutePath, markdown);

  return {
    filePath: rawIssue.filePath,
    moved: false,
  };
}
