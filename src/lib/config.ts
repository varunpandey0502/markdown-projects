import { readProjectSettings } from "./settings.ts";
import type { ProjectConfig } from "../types.ts";

export async function readConfig(projectPath: string): Promise<ProjectConfig> {
  return readProjectSettings(projectPath);
}

export function getStatusFolderName(config: ProjectConfig, statusName: string): string | undefined {
  const s = config.issues.statuses.find(
    (st) => st.name.toLowerCase() === statusName.toLowerCase(),
  );
  return s?.folderName;
}

export function getMilestoneStatusFolderName(config: ProjectConfig, statusName: string): string | undefined {
  const s = config.milestones.statuses.find(
    (st) => st.name.toLowerCase() === statusName.toLowerCase(),
  );
  return s?.folderName;
}

export function getStatusDisplayName(config: ProjectConfig, folderName: string): string | undefined {
  const s = config.issues.statuses.find(
    (st) => st.folderName.toLowerCase() === folderName.toLowerCase(),
  );
  return s?.name;
}

export function getMilestoneStatusDisplayName(config: ProjectConfig, folderName: string): string | undefined {
  const s = config.milestones.statuses.find(
    (st) => st.folderName.toLowerCase() === folderName.toLowerCase(),
  );
  return s?.name;
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
