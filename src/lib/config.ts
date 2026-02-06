import { readProjectSettings } from "./settings.ts";
import type { ProjectConfig } from "../types.ts";

export async function readConfig(projectPath: string): Promise<ProjectConfig> {
  return readProjectSettings(projectPath);
}

export function getDoneStatuses(config: ProjectConfig): string[] {
  return config.issues.statuses
    .filter((s) => /^(done|completed|closed)$/i.test(s.name))
    .map((s) => s.name);
}

export function getMilestoneDoneStatuses(config: ProjectConfig): string[] {
  return config.milestones.statuses
    .filter((s) => /^(done|completed|closed)$/i.test(s.name))
    .map((s) => s.name);
}
