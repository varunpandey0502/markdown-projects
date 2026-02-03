import { join, resolve } from "node:path";
import type { Command } from "commander";
import { PROJECT_DIR, SETTINGS_FILE, PRESET_ISSUE_TEMPLATES, DEFAULT_MILESTONE_TEMPLATE, generateIssueTemplate } from "../../constants.ts";
import { alreadyExists, MdpError } from "../../errors.ts";
import { ensureDir, pathExists, writeText } from "../../lib/fs-utils.ts";
import { readGlobalConfig, writeGlobalConfig, resolveAvailablePresets, getDefaultPresetName } from "../../lib/settings.ts";
import { getGlobalOptions } from "../../lib/command-utils.ts";
import { printSuccess, printError, verboseLog } from "../../output.ts";

export function registerProjectCreateCommand(parent: Command): void {
  parent
    .command("create")
    .description("Create a new markdown project and register it")
    .option("-F, --force", "Overwrite existing .mdp/ directory", false)
    .option("--preset <name>", "Project preset")
    .option("--with-templates", "Create default template files", true)
    .option("--no-with-templates", "Skip creating template files")
    .option("--issue-prefix <prefix>", "Prefix for issue IDs")
    .option("--milestone-prefix <prefix>", "Prefix for milestone IDs")
    .option("--tags <tags>", "Comma-separated tags for grouping")
    .action(async (options, cmd) => {
      try {
        const globals = getGlobalOptions(cmd);
        if (!globals.projectPath) {
          throw new MdpError(
            "PROJECT_NOT_FOUND",
            "No project path specified. Use -p <path> to specify where to initialize.",
            {},
            2,
          );
        }
        const projectPath = resolve(globals.projectPath);
        const mdpPath = join(projectPath, PROJECT_DIR);

        verboseLog(`Initializing project at ${projectPath}`);

        // Check if already exists
        if (await pathExists(mdpPath)) {
          if (!options.force) {
            throw alreadyExists(mdpPath);
          }
          verboseLog("Overwriting existing .mdp/ directory");
        }

        // Resolve preset (built-in + custom from global config)
        const presetName = options.preset ?? await getDefaultPresetName();
        const allPresets = await resolveAvailablePresets();
        const preset = allPresets[presetName];
        if (!preset) {
          const available = Object.keys(allPresets);
          throw new MdpError(
            "INVALID_INPUT",
            `Unknown preset "${presetName}". Available: ${available.join(", ")}`,
            { preset: presetName, available },
          );
        }

        // Build config: preset → CLI flag overrides
        const config = {
          issues: { ...preset.issues },
          milestones: { ...preset.milestones },
        };

        if (options.issuePrefix) {
          config.issues.prefix = options.issuePrefix;
        }
        if (options.milestonePrefix) {
          config.milestones.prefix = options.milestonePrefix;
        }

        const directories: string[] = [];
        const templates: string[] = [];

        // Create directory structure
        await ensureDir(mdpPath);

        // Issue status directories
        for (const status of config.issues.statuses) {
          const dir = join(mdpPath, "issues", status.folderName);
          await ensureDir(dir);
          directories.push(`${PROJECT_DIR}/issues/${status.folderName}`);
        }

        // Milestone status directories
        for (const status of config.milestones.statuses) {
          const dir = join(mdpPath, "milestones", status.folderName);
          await ensureDir(dir);
          directories.push(`${PROJECT_DIR}/milestones/${status.folderName}`);
        }

        // Docs and templates directories
        await ensureDir(join(mdpPath, "docs"));
        directories.push(`${PROJECT_DIR}/docs`);

        await ensureDir(join(mdpPath, "templates"));
        directories.push(`${PROJECT_DIR}/templates`);

        // Write settings.json
        const settingsPath = join(mdpPath, SETTINGS_FILE);
        await writeText(settingsPath, JSON.stringify(config, null, 2) + "\n");
        verboseLog(`Wrote ${SETTINGS_FILE}`);

        // Write templates
        if (options.withTemplates) {
          // Use preset-specific issue template, or generate from config
          const issueTemplate = PRESET_ISSUE_TEMPLATES[presetName] ?? generateIssueTemplate(config);
          const issueTemplatePath = join(mdpPath, "templates", "issue-template.md");
          await writeText(issueTemplatePath, issueTemplate);
          templates.push(`${PROJECT_DIR}/templates/issue-template.md`);

          const milestoneTemplatePath = join(mdpPath, "templates", "milestone-template.md");
          await writeText(milestoneTemplatePath, DEFAULT_MILESTONE_TEMPLATE);
          templates.push(`${PROJECT_DIR}/templates/milestone-template.md`);

          verboseLog("Wrote default templates");
        }

        // Register in global config
        const tags = options.tags
          ? options.tags.split(",").map((t: string) => t.trim()).filter(Boolean)
          : [];
        const globalConfig = (await readGlobalConfig()) ?? {};
        const projects = globalConfig.projects ?? [];
        if (!projects.some((p) => p.path === projectPath)) {
          projects.push({ path: projectPath, tags });
          globalConfig.projects = projects;
          await writeGlobalConfig(globalConfig);
          verboseLog("Registered project in global config");
        }

        printSuccess({
          projectPath,
          preset: presetName,
          registered: { path: projectPath, tags },
          created: {
            settingsFile: `${PROJECT_DIR}/${SETTINGS_FILE}`,
            directories,
            templates,
          },
        });
      } catch (err) {
        printError(err);
        process.exit(err instanceof MdpError ? err.exitCode : 1);
      }
    });
}
