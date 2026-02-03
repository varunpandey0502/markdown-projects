import type { Command } from "commander";
import { MdpError } from "../../errors.ts";
import { readConfig } from "../../lib/config.ts";
import { resolveProjectPath } from "../../lib/project-finder.ts";
import { getGlobalOptions } from "../../lib/command-utils.ts";
import { readAllIssues } from "../../lib/issue-reader.ts";
import { enrichIssue, filterIssues, sortIssues } from "../../lib/computed.ts";
import type { IssueFilters } from "../../lib/computed.ts";
import { parseCommaSeparated } from "../../lib/validators.ts";
import { printSuccess, printError, printTable, getFormat, verboseLog } from "../../output.ts";
import { formatTable, ISSUE_TABLE_COLUMNS } from "../../lib/table.ts";

export function registerIssueListCommand(issueCmd: Command): void {
  issueCmd
    .command("list")
    .description("List issues with filtering and sorting")
    .option("-s, --status <statuses>", "Comma-separated status filter")
    .option("--type <types>", "Comma-separated type filter")
    .option("--priority <priority>", "Priority filter")
    .option("-l, --labels <labels>", "Comma-separated labels filter")
    .option("-a, --assignee <assignee>", "Filter by assignee (use 'none' for unassigned)")
    .option("-m, --milestone <milestone>", "Filter by milestone ID (use 'none' for unassigned)")
    .option("--blocked <bool>", "true for blocked only, false for unblocked only")
    .option("--parent <id>", "Filter by parent issue ID (use 'none' for top-level)")
    .option("--sort <field>", "Sort field: id, title, status, priority, type, created, updated, estimate, spent, dueDate", "id")
    .option("--order <order>", "Sort order: asc, desc", "asc")
    .option("--created-after <date>", "Filter: created after date (YYYY-MM-DD)")
    .option("--created-before <date>", "Filter: created before date (YYYY-MM-DD)")
    .option("--due-before <date>", "Filter: due before date (YYYY-MM-DD)")
    .option("--due-after <date>", "Filter: due after date (YYYY-MM-DD)")
    .action(async (options, cmd) => {
      try {
        const globals = getGlobalOptions(cmd);
        const projectPath = await resolveProjectPath(globals.projectPath);
        const config = await readConfig(projectPath);

        verboseLog(`Reading issues from ${projectPath}`);

        const rawIssues = await readAllIssues(projectPath, config);
        const allEnriched = rawIssues.map((r) => enrichIssue(r, rawIssues));

        // Build filters
        const filters: IssueFilters = {};
        if (options.status) filters.status = parseCommaSeparated(options.status);
        if (options.type) filters.type = parseCommaSeparated(options.type);
        if (options.priority) filters.priority = options.priority;
        if (options.labels) filters.labels = parseCommaSeparated(options.labels);
        if (options.assignee) filters.assignee = options.assignee;
        if (options.milestone) filters.milestone = options.milestone;
        if (options.blocked !== undefined) filters.blocked = options.blocked === "true";
        if (options.parent) filters.parent = options.parent;
        if (options.createdAfter) filters.createdAfter = options.createdAfter;
        if (options.createdBefore) filters.createdBefore = options.createdBefore;
        if (options.dueAfter) filters.dueAfter = options.dueAfter;
        if (options.dueBefore) filters.dueBefore = options.dueBefore;

        const filtered = filterIssues(allEnriched, filters);
        const sorted = sortIssues(filtered, options.sort, options.order);

        // Strip content and log from list output for brevity
        const output = sorted.map(({ content, log, filePath, ...rest }) => rest);

        if (getFormat() === "table") {
          printTable(formatTable(output as Record<string, unknown>[], ISSUE_TABLE_COLUMNS));
          printTable(`\nTotal: ${output.length}`);
        } else {
          printSuccess({
            issues: output,
            total: output.length,
          });
        }
      } catch (err) {
        printError(err);
        process.exit(err instanceof MdpError ? err.exitCode : 1);
      }
    });
}
