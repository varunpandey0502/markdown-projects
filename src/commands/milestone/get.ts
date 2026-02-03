import type { Command } from "commander";
import { MdpError, milestoneNotFound } from "../../errors.ts";
import { readConfig } from "../../lib/config.ts";
import { resolveProjectPath } from "../../lib/project-finder.ts";
import { getGlobalOptions } from "../../lib/command-utils.ts";
import { readAllMilestones } from "../../lib/milestone-reader.ts";
import { readAllIssues } from "../../lib/issue-reader.ts";
import { enrichMilestone } from "../../lib/milestone-computed.ts";
import { printSuccess, printError, verboseLog } from "../../output.ts";

export function registerMilestoneGetCommand(milestoneCmd: Command): void {
  milestoneCmd
    .command("get")
    .description("Get a single milestone by ID with full details")
    .requiredOption("--id <id>", "Milestone ID")
    .option("--include-content", "Include markdown body in output", true)
    .option("--no-include-content", "Exclude markdown body from output")
    .action(async (options, cmd) => {
      try {
        const globals = getGlobalOptions(cmd);
        const projectPath = await resolveProjectPath(globals.projectPath);
        const config = await readConfig(projectPath);

        verboseLog(`Getting milestone ${options.id} from ${projectPath}`);

        const rawMilestones = await readAllMilestones(projectPath, config);
        const rawMilestone = rawMilestones.find(
          (m) => m.id.toLowerCase() === options.id.toLowerCase(),
        );

        if (!rawMilestone) {
          throw milestoneNotFound(options.id, projectPath);
        }

        const allIssues = await readAllIssues(projectPath, config);
        const milestone = enrichMilestone(rawMilestone, allIssues, config, options.includeContent);

        printSuccess(milestone);
      } catch (err) {
        printError(err);
        process.exit(err instanceof MdpError ? err.exitCode : 1);
      }
    });
}
