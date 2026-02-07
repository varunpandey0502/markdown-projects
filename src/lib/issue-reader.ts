import { join } from "node:path";
import { PROJECT_DIR } from "../constants.ts";
import { readConfig } from "./config.ts";
import { listDir, readText, isDirectory } from "./fs-utils.ts";
import { parseMarkdown, getString, getNumber, getStringArray, getChecklist, getLogEntries } from "./frontmatter.ts";
import type { IssueFrontmatter, ProjectConfig } from "../types.ts";

export interface RawIssue extends IssueFrontmatter {
  filePath: string;
  content: string;
}

export async function readAllIssues(projectPath: string, config?: ProjectConfig): Promise<RawIssue[]> {
  if (!config) {
    config = await readConfig(projectPath);
  }

  const issuesBase = join(projectPath, PROJECT_DIR, "issues");
  const folders = await listDir(issuesBase);
  const issues: RawIssue[] = [];

  for (const folder of folders) {
    const folderPath = join(issuesBase, folder);
    if (!(await isDirectory(folderPath))) continue;

    const mdFile = join(folderPath, `${folder}.md`);

    try {
      const raw = await readText(mdFile);
      const parsed = parseMarkdown(raw);
      const fm = parsed.frontmatter;

      const issue: RawIssue = {
        id: getString(fm, "id") ?? folder.split("-").slice(0, 2).join("-"),
        title: getString(fm, "title") ?? "",
        type: getString(fm, "type") ?? null,
        status: getString(fm, "status") ?? "",
        priority: getString(fm, "priority") ?? null,
        labels: getStringArray(fm, "labels"),
        assignee: getString(fm, "assignee"),
        milestone: getString(fm, "milestone"),
        estimate: getNumber(fm, "estimate"),
        spent: getNumber(fm, "spent"),
        dueDate: getString(fm, "dueDate"),
        blockedBy: getStringArray(fm, "blockedBy"),
        parent: getString(fm, "parent"),
        relatedTo: getStringArray(fm, "relatedTo"),
        checklist: getChecklist(fm, "checklist"),
        log: getLogEntries(fm, "log"),
        createdAt: getString(fm, "createdAt") ?? new Date().toISOString(),
        updatedAt: getString(fm, "updatedAt") ?? new Date().toISOString(),
        filePath: `${PROJECT_DIR}/issues/${folder}/${folder}.md`,
        content: parsed.content,
      };

      issues.push(issue);
    } catch {
      // Skip files that can't be parsed
    }
  }

  return issues;
}

export async function findIssueById(projectPath: string, issueId: string, config?: ProjectConfig): Promise<RawIssue | null> {
  const issues = await readAllIssues(projectPath, config);
  return issues.find((i) => i.id.toLowerCase() === issueId.toLowerCase()) ?? null;
}

export function findIssueAbsolutePath(projectPath: string, relativePath: string): string {
  return join(projectPath, relativePath);
}
