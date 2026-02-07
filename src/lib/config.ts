import { readProjectSettings } from "./settings.ts";
import type { ProjectConfig, StatusConfig } from "../types.ts";

export async function readConfig(projectPath: string): Promise<ProjectConfig> {
  return readProjectSettings(projectPath);
}

export function flattenStatuses<T extends string>(statuses: Record<T, StatusConfig[]>): StatusConfig[] {
  return (Object.values(statuses) as StatusConfig[][]).flat();
}

export function getDoneStatuses(config: ProjectConfig): string[] {
  return config.issues.statuses.completed.map((s) => s.name);
}

export function getMilestoneDoneStatuses(config: ProjectConfig): string[] {
  return config.milestones.statuses.completed.map((s) => s.name);
}

export function getCancelledStatuses(config: ProjectConfig): string[] {
  return config.issues.statuses.canceled.map((s) => s.name);
}
