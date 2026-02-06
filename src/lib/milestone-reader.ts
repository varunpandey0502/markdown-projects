import { join } from "node:path";
import { PROJECT_DIR } from "../constants.ts";
import { readConfig } from "./config.ts";
import { listDir, readText, isDirectory } from "./fs-utils.ts";
import { parseMarkdown, getString, getStringArray, getChecklist, getLogEntries } from "./frontmatter.ts";
import type { MilestoneFrontmatter, ProjectConfig } from "../types.ts";

export interface RawMilestone extends MilestoneFrontmatter {
  filePath: string;
  content: string;
}

export async function readAllMilestones(projectPath: string, config?: ProjectConfig): Promise<RawMilestone[]> {
  if (!config) {
    config = await readConfig(projectPath);
  }

  const milestonesBase = join(projectPath, PROJECT_DIR, "milestones");
  const folders = await listDir(milestonesBase);
  const milestones: RawMilestone[] = [];

  for (const folder of folders) {
    const folderPath = join(milestonesBase, folder);
    if (!(await isDirectory(folderPath))) continue;

    const mdFile = join(folderPath, `${folder}.md`);

    try {
      const raw = await readText(mdFile);
      const parsed = parseMarkdown(raw);
      const fm = parsed.frontmatter;

      const milestone: RawMilestone = {
        id: getString(fm, "id") ?? folder.split("-").slice(0, 2).join("-"),
        title: getString(fm, "title") ?? "",
        status: getString(fm, "status") ?? "Planning",
        priority: getString(fm, "priority") ?? "None",
        labels: getStringArray(fm, "labels"),
        startDate: getString(fm, "startDate"),
        dueDate: getString(fm, "dueDate"),
        checklist: getChecklist(fm, "checklist"),
        log: getLogEntries(fm, "log"),
        createdAt: getString(fm, "createdAt") ?? new Date().toISOString(),
        updatedAt: getString(fm, "updatedAt") ?? new Date().toISOString(),
        filePath: `${PROJECT_DIR}/milestones/${folder}/${folder}.md`,
        content: parsed.content,
      };

      milestones.push(milestone);
    } catch {
      // Skip files that can't be parsed
    }
  }

  return milestones;
}

export async function findMilestoneById(projectPath: string, milestoneId: string, config?: ProjectConfig): Promise<RawMilestone | null> {
  const milestones = await readAllMilestones(projectPath, config);
  return milestones.find((m) => m.id.toLowerCase() === milestoneId.toLowerCase()) ?? null;
}

export function findMilestoneAbsolutePath(projectPath: string, relativePath: string): string {
  return join(projectPath, relativePath);
}
