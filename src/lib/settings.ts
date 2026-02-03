import { join } from "node:path";
import { homedir } from "node:os";
import { PROJECT_DIR, SETTINGS_FILE, USER_SETTINGS_DIR, USER_CONFIG_FILE, PRESETS, DEFAULT_PRESET } from "../constants.ts";
import { configError } from "../errors.ts";
import { pathExists, readText, writeText, ensureDir } from "./fs-utils.ts";
import type { ProjectConfig, IssueConfig, MilestoneConfig, GlobalConfig, RegisteredProject } from "../types.ts";

// ── Paths ──

export function getGlobalConfigPath(): string {
  return join(homedir(), USER_SETTINGS_DIR, USER_CONFIG_FILE);
}

export function getProjectSettingsPath(projectPath: string): string {
  return join(projectPath, PROJECT_DIR, SETTINGS_FILE);
}

// ── Readers ──

export async function readGlobalConfig(): Promise<GlobalConfig | null> {
  const configPath = getGlobalConfigPath();

  if (await pathExists(configPath)) {
    try {
      const raw = await readText(configPath);
      return JSON.parse(raw) as GlobalConfig;
    } catch (err) {
      if (err instanceof SyntaxError) {
        throw configError(`Invalid JSON in global config (${configPath}): ${err.message}`);
      }
      throw err;
    }
  }

  return null;
}

export async function readProjectSettings(projectPath: string): Promise<ProjectConfig> {
  const settingsPath = getProjectSettingsPath(projectPath);
  if (!(await pathExists(settingsPath))) {
    throw configError(`settings.json not found at ${settingsPath}`);
  }
  try {
    const raw = await readText(settingsPath);
    return JSON.parse(raw) as ProjectConfig;
  } catch (err) {
    if (err instanceof SyntaxError) {
      throw configError(`Invalid JSON in project settings (${settingsPath}): ${err.message}`);
    }
    throw err;
  }
}

// ── Config Merge Helpers (used at project creation time) ──

export function mergeIssueConfig(base: IssueConfig, override: Partial<IssueConfig>): IssueConfig {
  return {
    prefix: override.prefix ?? base.prefix,
    statuses: override.statuses ?? base.statuses,
    priorities: override.priorities ?? base.priorities,
    labels: override.labels ?? base.labels,
    types: override.types ?? base.types,
  };
}

export function mergeMilestoneConfig(base: MilestoneConfig, override: Partial<MilestoneConfig>): MilestoneConfig {
  return {
    prefix: override.prefix ?? base.prefix,
    statuses: override.statuses ?? base.statuses,
    priorities: override.priorities ?? base.priorities,
    labels: override.labels ?? base.labels,
  };
}

// ── Presets ──

export async function resolveAvailablePresets(): Promise<Record<string, ProjectConfig>> {
  const globalConfig = await readGlobalConfig();
  const customPresets = globalConfig?.presets ?? {};
  return { ...PRESETS, ...customPresets };
}

export async function getDefaultPresetName(): Promise<string> {
  const globalConfig = await readGlobalConfig();
  return globalConfig?.defaults?.preset ?? DEFAULT_PRESET;
}

export async function getDefaultFormat(): Promise<"json" | "table"> {
  const globalConfig = await readGlobalConfig();
  return globalConfig?.defaults?.format ?? "json";
}

// ── Registered Projects ──

export async function readRegisteredProjects(): Promise<RegisteredProject[]> {
  const config = await readGlobalConfig();
  return config?.projects ?? [];
}

export async function writeGlobalConfig(config: GlobalConfig): Promise<void> {
  const configPath = getGlobalConfigPath();
  const dir = join(homedir(), USER_SETTINGS_DIR);
  await ensureDir(dir);
  await writeText(configPath, JSON.stringify(config, null, 2) + "\n");
}
