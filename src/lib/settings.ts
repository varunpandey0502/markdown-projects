import { join } from "node:path";
import { homedir } from "node:os";
import { basename } from "node:path";
import { PROJECT_DIR, PROJECT_FILE, USER_SETTINGS_DIR, USER_CONFIG_FILE, PRESETS, DEFAULT_PRESET } from "../constants.ts";
import { configError } from "../errors.ts";
import { pathExists, readText, writeText, ensureDir } from "./fs-utils.ts";
import type { ProjectConfig, PresetConfig, IssueConfig, MilestoneConfig, GlobalConfig, RegisteredProject } from "../types.ts";

// ── Paths ──

export function getGlobalConfigPath(): string {
  return join(homedir(), USER_SETTINGS_DIR, USER_CONFIG_FILE);
}

export function getProjectFilePath(projectPath: string): string {
  return join(projectPath, PROJECT_DIR, PROJECT_FILE);
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

export async function readProjectConfig(projectPath: string): Promise<ProjectConfig> {
  const projectFilePath = getProjectFilePath(projectPath);

  // Try project.json first, fall back to legacy settings.json
  let filePath = projectFilePath;
  let isLegacy = false;
  if (!(await pathExists(projectFilePath))) {
    const legacyPath = join(projectPath, PROJECT_DIR, "settings.json");
    if (await pathExists(legacyPath)) {
      filePath = legacyPath;
      isLegacy = true;
    } else {
      throw configError(`project.json not found at ${projectFilePath}`);
    }
  }

  try {
    const raw = await readText(filePath);
    const parsed = JSON.parse(raw) as Record<string, unknown>;

    // If legacy file or missing name, backfill project metadata
    if (isLegacy || !parsed.name) {
      const config: ProjectConfig = {
        name: (parsed.name as string) ?? basename(projectPath),
        issues: parsed.issues as ProjectConfig["issues"],
        milestones: parsed.milestones as ProjectConfig["milestones"],
      };
      if (parsed.description) config.description = parsed.description as string;
      if (parsed.instructions) config.instructions = parsed.instructions as string;
      return config;
    }

    return parsed as unknown as ProjectConfig;
  } catch (err) {
    if (err instanceof SyntaxError) {
      throw configError(`Invalid JSON in project config (${filePath}): ${err.message}`);
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

export async function resolveAvailablePresets(): Promise<Record<string, PresetConfig>> {
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

// ── Tag Helpers ──

export function ensureTagsExist(config: GlobalConfig, tags: string[]): void {
  if (tags.length === 0) return;
  if (!config.tags) config.tags = {};
  for (const tag of tags) {
    if (!(tag in config.tags)) config.tags[tag] = "";
  }
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
