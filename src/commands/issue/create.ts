import type { Command } from "commander";
import { MdpError } from "../../errors.ts";
import { readConfig } from "../../lib/config.ts";
import { resolveProjectPath } from "../../lib/project-finder.ts";
import { getGlobalOptions } from "../../lib/command-utils.ts";
import { getNextId } from "../../lib/id.ts";
import { readStdin } from "../../lib/stdin.ts";
import { prepareIssueCreate, writeIssueCreate } from "../../lib/issue-operations.ts";
import { printSuccess, printError, verboseLog } from "../../output.ts";

export function registerIssueCreateCommand(issueCmd: Command): void {
  issueCmd
    .command("create")
    .description("Create a new issue")
    .requiredOption("-t, --title <title>", "Issue title")
    .option("--type <type>", "Issue type (config-driven)")
    .option("-s, --status <status>", "Initial status")
    .option("--priority <priority>", "Priority level")
    .option("-l, --labels <labels>", "Comma-separated labels")
    .option("-a, --assignee <assignee>", "Assignee identifier")
    .option("-m, --milestone <milestone>", "Milestone ID")
    .option("-e, --estimate <estimate>", "Effort points (positive integer)")
    .option("--spent <spent>", "Actual effort spent")
    .option("--due-date <date>", "Due date (YYYY-MM-DD)")
    .option("--blocked-by <ids>", "Comma-separated issue IDs")
    .option("--parent <id>", "Parent issue ID")
    .option("--related-to <ids>", "Comma-separated issue IDs")
    .option("--checklist <items>", "Comma-separated checklist items")
    .option("-d, --description <desc>", "Short description")
    .option("-c, --content <content>", "Full markdown body (or - for stdin)")
    .option("--template <name>", "Template name from .mdp/templates/")
    .option("--dry-run", "Preview without creating", false)
    .action(async (options, cmd) => {
      try {
        const globals = getGlobalOptions(cmd);
        const projectPath = await resolveProjectPath(globals.projectPath);
        const config = await readConfig(projectPath);

        verboseLog(`Creating issue in ${projectPath}`);

        // Handle stdin content
        let content = options.content;
        if (content === "-") {
          content = await readStdin();
        }

        const id = options.dryRun ? `${config.issues.prefix}-XXX` : await getNextId(projectPath, config.issues.prefix, "issues");

        const prepared = await prepareIssueCreate(
          {
            title: options.title,
            type: options.type,
            status: options.status,
            priority: options.priority,
            labels: options.labels,
            assignee: options.assignee,
            milestone: options.milestone,
            estimate: options.estimate,
            spent: options.spent,
            dueDate: options.dueDate,
            blockedBy: options.blockedBy,
            parent: options.parent,
            relatedTo: options.relatedTo,
            checklist: options.checklist,
            description: options.description,
            content,
            template: options.template,
          },
          config,
          projectPath,
          id,
        );

        if (options.dryRun) {
          printSuccess({
            dryRun: true,
            ...prepared.frontmatter,
            filePath: prepared.filePath,
            content: prepared.content,
          }, prepared.warnings);
          return;
        }

        await writeIssueCreate(projectPath, prepared);

        verboseLog(`Created issue at ${prepared.filePath}`);

        printSuccess({
          ...prepared.frontmatter,
          filePath: prepared.filePath,
        }, prepared.warnings);
      } catch (err) {
        printError(err);
        process.exit(err instanceof MdpError ? err.exitCode : 1);
      }
    });
}
