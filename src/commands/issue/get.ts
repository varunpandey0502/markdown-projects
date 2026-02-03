import type { Command } from "commander";
import { MdpError, issueNotFound } from "../../errors.ts";
import { readConfig } from "../../lib/config.ts";
import { resolveProjectPath } from "../../lib/project-finder.ts";
import { getGlobalOptions } from "../../lib/command-utils.ts";
import { readAllIssues } from "../../lib/issue-reader.ts";
import { enrichIssue } from "../../lib/computed.ts";
import { printSuccess, printError, verboseLog } from "../../output.ts";

export function registerIssueGetCommand(issueCmd: Command): void {
  issueCmd
    .command("get")
    .description("Get a single issue by ID with full details")
    .requiredOption("--id <id>", "Issue ID")
    .option("--include-content", "Include markdown body in output", true)
    .option("--no-include-content", "Exclude markdown body from output")
    .action(async (options, cmd) => {
      try {
        const globals = getGlobalOptions(cmd);
        const projectPath = await resolveProjectPath(globals.projectPath);
        const config = await readConfig(projectPath);

        verboseLog(`Getting issue ${options.id} from ${projectPath}`);

        const rawIssues = await readAllIssues(projectPath, config);
        const rawIssue = rawIssues.find(
          (i) => i.id.toLowerCase() === options.id.toLowerCase(),
        );

        if (!rawIssue) {
          throw issueNotFound(options.id, projectPath);
        }

        const issue = enrichIssue(rawIssue, rawIssues, options.includeContent);

        printSuccess(issue);
      } catch (err) {
        printError(err);
        process.exit(err instanceof MdpError ? err.exitCode : 1);
      }
    });
}
