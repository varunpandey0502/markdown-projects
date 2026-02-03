import type { Command } from "commander";
import { MdpError, milestoneNotFound } from "../../errors.ts";
import { readConfig } from "../../lib/config.ts";
import { resolveProjectPath } from "../../lib/project-finder.ts";
import { getGlobalOptions } from "../../lib/command-utils.ts";
import { readAllMilestones } from "../../lib/milestone-reader.ts";
import { readAllIssues } from "../../lib/issue-reader.ts";
import { computeMilestoneProgress } from "../../lib/milestone-computed.ts";
import { enrichIssue } from "../../lib/computed.ts";
import { printSuccess, printError, verboseLog } from "../../output.ts";

export function registerMilestoneProgressCommand(milestoneCmd: Command): void {
  milestoneCmd
    .command("progress")
    .description("Show detailed progress report for a milestone")
    .requiredOption("--id <id>", "Milestone ID")
    .action(async (options, cmd) => {
      try {
        const globals = getGlobalOptions(cmd);
        const projectPath = await resolveProjectPath(globals.projectPath);
        const config = await readConfig(projectPath);

        verboseLog(`Getting progress for milestone ${options.id}`);

        const rawMilestones = await readAllMilestones(projectPath, config);
        const rawMilestone = rawMilestones.find(
          (m) => m.id.toLowerCase() === options.id.toLowerCase(),
        );

        if (!rawMilestone) {
          throw milestoneNotFound(options.id, projectPath);
        }

        const allIssues = await readAllIssues(projectPath, config);
        const progress = computeMilestoneProgress(rawMilestone, allIssues, config);

        // Build issue list for this milestone
        const assignedIssues = allIssues
          .filter((i) => i.milestone?.toLowerCase() === rawMilestone.id.toLowerCase())
          .map((i) => {
            const enriched = enrichIssue(i, allIssues);
            return {
              id: enriched.id,
              title: enriched.title,
              status: enriched.status,
              priority: enriched.priority,
              type: enriched.type,
              assignee: enriched.assignee,
              estimate: enriched.estimate,
              spent: enriched.spent,
            };
          });

        printSuccess({
          id: rawMilestone.id,
          title: rawMilestone.title,
          status: rawMilestone.status,
          startDate: rawMilestone.startDate,
          dueDate: rawMilestone.dueDate,
          ...progress,
          issues: assignedIssues,
        });
      } catch (err) {
        printError(err);
        process.exit(err instanceof MdpError ? err.exitCode : 1);
      }
    });
}
