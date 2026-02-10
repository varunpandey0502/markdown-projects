import { readProjectConfig } from "./settings.ts";
import type { PresetConfig, StatusConfig } from "../types.ts";

export async function readConfig(projectPath: string): Promise<PresetConfig> {
  return readProjectConfig(projectPath);
}

export function flattenStatuses<T extends string>(statuses: Record<T, StatusConfig[]>): StatusConfig[] {
  return (Object.values(statuses) as StatusConfig[][]).flat();
}

export function getDoneStatuses(config: PresetConfig): string[] {
  return config.issues.statuses.completed.map((s) => s.name);
}

export function getMilestoneDoneStatuses(config: PresetConfig): string[] {
  return config.milestones.statuses.completed.map((s) => s.name);
}

export function getCancelledStatuses(config: PresetConfig): string[] {
  return config.issues.statuses.canceled.map((s) => s.name);
}
