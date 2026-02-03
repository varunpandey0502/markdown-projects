import { join } from "node:path";
import { PROJECT_DIR } from "../constants.ts";
import { readConfig, getStatusDisplayName } from "./config.ts";
import { listSubDirs, listDir, readText } from "./fs-utils.ts";
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
  const statusDirs = await listSubDirs(issuesBase);
  const issues: RawIssue[] = [];

  for (const statusDir of statusDirs) {
    const statusPath = join(issuesBase, statusDir);
    const issueFolders = await listDir(statusPath);

    for (const folder of issueFolders) {
      const folderPath = join(statusPath, folder);
      const mdFile = join(folderPath, `${folder}.md`);

      try {
        const raw = await readText(mdFile);
        const parsed = parseMarkdown(raw);
        const fm = parsed.frontmatter;

        const issue: RawIssue = {
          id: getString(fm, "id") ?? folder.split("-").slice(0, 2).join("-"),
          title: getString(fm, "title") ?? "",
          type: getString(fm, "type") ?? "task",
          status: getString(fm, "status") ?? getStatusDisplayName(config!, statusDir) ?? statusDir,
          priority: getString(fm, "priority") ?? "None",
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
          filePath: `${PROJECT_DIR}/issues/${statusDir}/${folder}/${folder}.md`,
          content: parsed.content,
        };

        issues.push(issue);
      } catch {
        // Skip files that can't be parsed
      }
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
