import type { Command } from "commander";
import { MdpError, milestoneNotFound } from "../../errors.ts";
import { readConfig } from "../../lib/config.ts";
import { resolveProjectPath } from "../../lib/project-finder.ts";
import { getGlobalOptions } from "../../lib/command-utils.ts";
import { readAllMilestones, findMilestoneAbsolutePath } from "../../lib/milestone-reader.ts";
import { readAllIssues } from "../../lib/issue-reader.ts";
import { buildMarkdown, parseMarkdown } from "../../lib/frontmatter.ts";
import { readText, writeText, removeDir } from "../../lib/fs-utils.ts";
import { findIssueAbsolutePath } from "../../lib/issue-reader.ts";
import { printSuccess, printError, verboseLog } from "../../output.ts";
import { dirname } from "node:path";

export function registerMilestoneDeleteCommand(milestoneCmd: Command): void {
  milestoneCmd
    .command("delete")
    .description("Delete a milestone and clean up issue references")
    .requiredOption("--id <id>", "Milestone ID to delete")
    .option("--dry-run", "Preview without deleting", false)
    .action(async (options, cmd) => {
      try {
        const globals = getGlobalOptions(cmd);
        const projectPath = await resolveProjectPath(globals.projectPath);
        const config = await readConfig(projectPath);

        verboseLog(`Deleting milestone ${options.id} from ${projectPath}`);

        const allMilestones = await readAllMilestones(projectPath, config);
        const target = allMilestones.find(
          (m) => m.id.toLowerCase() === options.id.toLowerCase(),
        );

        if (!target) {
          throw milestoneNotFound(options.id, projectPath);
        }

        // Find issues assigned to this milestone
        const allIssues = await readAllIssues(projectPath, config);
        const assignedIssues = allIssues.filter(
          (i) => i.milestone?.toLowerCase() === target.id.toLowerCase(),
        );

        if (options.dryRun) {
          printSuccess({
            dryRun: true,
            id: target.id,
            filePath: target.filePath,
            issuesUnassigned: assignedIssues.map((i) => i.id),
          });
          return;
        }

        // Clear milestone reference from assigned issues
        for (const issue of assignedIssues) {
          const absPath = findIssueAbsolutePath(projectPath, issue.filePath);
          const raw = await readText(absPath);
          const parsed = parseMarkdown(raw);
          const fm = { ...parsed.frontmatter };

          fm.milestone = null;
          fm.updatedAt = new Date().toISOString();

          const markdown = buildMarkdown(fm, parsed.content);
          await writeText(absPath, markdown);
          verboseLog(`Cleared milestone reference in ${issue.id}`);
        }

        // Delete milestone folder
        const absPath = findMilestoneAbsolutePath(projectPath, target.filePath);
        const folderPath = dirname(absPath);
        await removeDir(folderPath);
        verboseLog(`Deleted folder ${folderPath}`);

        printSuccess({
          id: target.id,
          deleted: true,
          filePath: target.filePath,
          issuesUnassigned: assignedIssues.map((i) => i.id),
        });
      } catch (err) {
        printError(err);
        process.exit(err instanceof MdpError ? err.exitCode : 1);
      }
    });
}
