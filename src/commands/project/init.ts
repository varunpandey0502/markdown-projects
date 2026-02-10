import { join, resolve, basename } from "node:path";
import type { Command } from "commander";
import { PROJECT_DIR, PROJECT_FILE, generateIssueTemplate, generateMilestoneTemplate } from "../../constants.ts";
import type { ProjectConfig } from "../../types.ts";
import { alreadyExists, MdpError } from "../../errors.ts";
import { ensureDir, pathExists, writeText } from "../../lib/fs-utils.ts";
import { readGlobalConfig, writeGlobalConfig, resolveAvailablePresets, getDefaultPresetName, ensureTagsExist } from "../../lib/settings.ts";
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
    .option("--name <name>", "Project name")
    .option("--description <description>", "One-line project description")
    .option("--instructions <instructions>", "Free-text guidance for LLMs and collaborators")
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

        // Build config: preset → CLI flag overrides → project metadata
        const issues = { ...preset.issues };
        const milestones = { ...preset.milestones };

        if (options.issuePrefix) {
          issues.prefix = options.issuePrefix;
        }
        if (options.milestonePrefix) {
          milestones.prefix = options.milestonePrefix;
        }

        const config: ProjectConfig = {
          name: options.name ?? basename(projectPath),
          ...(options.description && { description: options.description }),
          ...(options.instructions && { instructions: options.instructions }),
          issues,
          milestones,
        };

        const directories: string[] = [];
        const templates: string[] = [];

        // Create directory structure
        await ensureDir(mdpPath);

        // Create issues and milestones directories (flat — no status subdirs)
        await ensureDir(join(mdpPath, "issues"));
        directories.push(`${PROJECT_DIR}/issues`);

        await ensureDir(join(mdpPath, "milestones"));
        directories.push(`${PROJECT_DIR}/milestones`);

        // Docs and templates directories
        await ensureDir(join(mdpPath, "docs"));
        directories.push(`${PROJECT_DIR}/docs`);

        await ensureDir(join(mdpPath, "templates"));
        directories.push(`${PROJECT_DIR}/templates`);

        // Write project.json
        const projectFilePath = join(mdpPath, PROJECT_FILE);
        await writeText(projectFilePath, JSON.stringify(config, null, 2) + "\n");
        verboseLog(`Wrote ${PROJECT_FILE}`);

        // Write templates
        if (options.withTemplates) {
          const issueTemplate = generateIssueTemplate(config, presetName);
          const issueTemplatePath = join(mdpPath, "templates", "issue-template.md");
          await writeText(issueTemplatePath, issueTemplate);
          templates.push(`${PROJECT_DIR}/templates/issue-template.md`);

          const milestoneTemplate = generateMilestoneTemplate(config);
          const milestoneTemplatePath = join(mdpPath, "templates", "milestone-template.md");
          await writeText(milestoneTemplatePath, milestoneTemplate);
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
          ensureTagsExist(globalConfig, tags);
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
            projectFile: `${PROJECT_DIR}/${PROJECT_FILE}`,
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
