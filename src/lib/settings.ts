import { join } from "node:path";
import { homedir } from "node:os";
import { PROJECT_DIR, PROJECT_FILE, PROJECT_MD, USER_SETTINGS_DIR, USER_CONFIG_FILE, PRESETS, DEFAULT_PRESET } from "../constants.ts";
import { configError } from "../errors.ts";
import { pathExists, readText, writeText, ensureDir } from "./fs-utils.ts";
import { parseMarkdown, getString, getProjectLogEntries } from "./frontmatter.ts";
import type { PresetConfig, IssueConfig, MilestoneConfig, GlobalConfig, RegisteredProject, ProjectData, ProjectHealth } from "../types.ts";

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

export async function readProjectConfig(projectPath: string): Promise<PresetConfig> {
  const projectFilePath = getProjectFilePath(projectPath);

  if (!(await pathExists(projectFilePath))) {
    throw configError(`settings.json not found at ${projectFilePath}`);
  }

  try {
    const raw = await readText(projectFilePath);
    const parsed = JSON.parse(raw) as PresetConfig;
    return parsed;
  } catch (err) {
    if (err instanceof SyntaxError) {
      throw configError(`Invalid JSON in project config (${projectFilePath}): ${err.message}`);
    }
    throw err;
  }
}

export function getProjectMdPath(projectPath: string): string {
  return join(projectPath, PROJECT_DIR, PROJECT_MD);
}

const VALID_HEALTH_VALUES = new Set(["on-track", "at-risk", "off-track"]);

export async function readProjectMd(projectPath: string): Promise<ProjectData> {
  const filePath = getProjectMdPath(projectPath);

  if (!(await pathExists(filePath))) {
    throw configError(`project.md not found at ${filePath}`);
  }

  const raw = await readText(filePath);
  const parsed = parseMarkdown(raw);
  const fm = parsed.frontmatter;

  const healthRaw = getString(fm, "health");
  const health = healthRaw && VALID_HEALTH_VALUES.has(healthRaw) ? (healthRaw as ProjectHealth) : undefined;

  const rawLog = getProjectLogEntries(fm, "log");
  const log = rawLog.map((entry) => ({
    ...entry,
    health: entry.health && VALID_HEALTH_VALUES.has(entry.health) ? (entry.health as ProjectHealth) : undefined,
  }));

  return {
    title: getString(fm, "title") ?? "",
    description: getString(fm, "description") ?? undefined,
    instructions: getString(fm, "instructions") ?? undefined,
    health,
    log,
    createdAt: getString(fm, "createdAt") ?? new Date().toISOString(),
    updatedAt: getString(fm, "updatedAt") ?? new Date().toISOString(),
    filePath: `${PROJECT_DIR}/${PROJECT_MD}`,
    content: parsed.content,
  };
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
