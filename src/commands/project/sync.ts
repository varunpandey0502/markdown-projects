import { join, basename, dirname } from "node:path";
import type { Command } from "commander";
import { PROJECT_DIR } from "../../constants.ts";
import { MdpError } from "../../errors.ts";
import { readConfig, getStatusFolderName, getMilestoneStatusFolderName } from "../../lib/config.ts";
import { resolveProjectPath } from "../../lib/project-finder.ts";
import { getGlobalOptions } from "../../lib/command-utils.ts";
import { readAllIssues } from "../../lib/issue-reader.ts";
import { readAllMilestones } from "../../lib/milestone-reader.ts";
import { slugify } from "../../lib/slug.ts";
import { renameEntry, ensureDir, pathExists } from "../../lib/fs-utils.ts";
import { printSuccess, printError, verboseLog } from "../../output.ts";

interface SyncAction {
  type: "move" | "rename";
  entity: "issue" | "milestone";
  id: string;
  from: string;
  to: string;
}

export function registerFixCommand(program: Command): void {
  program
    .command("fix")
    .description("Fix folder names and status directories to match frontmatter")
    .option("--dry-run", "Preview changes without applying", false)
    .action(async (options, cmd) => {
      try {
        const globals = getGlobalOptions(cmd);
        const projectPath = await resolveProjectPath(globals.projectPath);
        const config = await readConfig(projectPath);

        verboseLog(`Fixing project at ${projectPath}`);

        const actions: SyncAction[] = [];

        // Sync issues
        const issues = await readAllIssues(projectPath, config);
        for (const issue of issues) {
          const expectedStatusFolder = getStatusFolderName(config, issue.status);
          if (!expectedStatusFolder) continue;

          const currentParts = issue.filePath.split("/");
          // .mdp/issues/{statusFolder}/{folderName}/{folderName}.md
          const currentStatusFolder = currentParts[2]!;
          const currentFolderName = currentParts[3]!;

          const expectedSlug = slugify(issue.title);
          const expectedFolderName = `${issue.id}-${expectedSlug}`;

          // Check status folder
          if (currentStatusFolder !== expectedStatusFolder) {
            actions.push({
              type: "move",
              entity: "issue",
              id: issue.id,
              from: `${PROJECT_DIR}/issues/${currentStatusFolder}/${currentFolderName}`,
              to: `${PROJECT_DIR}/issues/${expectedStatusFolder}/${currentFolderName}`,
            });
          }

          // Check folder name (slug mismatch)
          if (currentFolderName !== expectedFolderName) {
            const statusFolder = currentStatusFolder !== expectedStatusFolder
              ? expectedStatusFolder
              : currentStatusFolder;
            actions.push({
              type: "rename",
              entity: "issue",
              id: issue.id,
              from: `${PROJECT_DIR}/issues/${statusFolder}/${currentFolderName}`,
              to: `${PROJECT_DIR}/issues/${statusFolder}/${expectedFolderName}`,
            });
          }
        }

        // Sync milestones
        const milestones = await readAllMilestones(projectPath, config);
        for (const milestone of milestones) {
          const expectedStatusFolder = getMilestoneStatusFolderName(config, milestone.status);
          if (!expectedStatusFolder) continue;

          const currentParts = milestone.filePath.split("/");
          const currentStatusFolder = currentParts[2]!;
          const currentFolderName = currentParts[3]!;

          const expectedSlug = slugify(milestone.title);
          const expectedFolderName = `${milestone.id}-${expectedSlug}`;

          if (currentStatusFolder !== expectedStatusFolder) {
            actions.push({
              type: "move",
              entity: "milestone",
              id: milestone.id,
              from: `${PROJECT_DIR}/milestones/${currentStatusFolder}/${currentFolderName}`,
              to: `${PROJECT_DIR}/milestones/${expectedStatusFolder}/${currentFolderName}`,
            });
          }

          if (currentFolderName !== expectedFolderName) {
            const statusFolder = currentStatusFolder !== expectedStatusFolder
              ? expectedStatusFolder
              : currentStatusFolder;
            actions.push({
              type: "rename",
              entity: "milestone",
              id: milestone.id,
              from: `${PROJECT_DIR}/milestones/${statusFolder}/${currentFolderName}`,
              to: `${PROJECT_DIR}/milestones/${statusFolder}/${expectedFolderName}`,
            });
          }
        }

        if (options.dryRun || actions.length === 0) {
          printSuccess({
            dryRun: options.dryRun,
            actions,
            total: actions.length,
          });
          return;
        }

        // Apply actions
        const applied: SyncAction[] = [];
        for (const action of actions) {
          const fromAbs = join(projectPath, action.from);
          const toAbs = join(projectPath, action.to);

          if (!(await pathExists(fromAbs))) {
            verboseLog(`Skipping ${action.from} — not found`);
            continue;
          }

          await ensureDir(dirname(toAbs));
          await renameEntry(fromAbs, toAbs);

          // If rename, also rename the .md file inside
          if (action.type === "rename") {
            const oldFolderName = basename(action.from);
            const newFolderName = basename(action.to);
            const oldMdFile = join(toAbs, `${oldFolderName}.md`);
            const newMdFile = join(toAbs, `${newFolderName}.md`);
            if (await pathExists(oldMdFile)) {
              await renameEntry(oldMdFile, newMdFile);
            }
          }

          applied.push(action);
          verboseLog(`Applied: ${action.type} ${action.from} -> ${action.to}`);
        }

        printSuccess({
          actions: applied,
          total: applied.length,
        });
      } catch (err) {
        printError(err);
        process.exit(err instanceof MdpError ? err.exitCode : 1);
      }
    });
}
