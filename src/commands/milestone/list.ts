import type { Command } from "commander";
import { MdpError } from "../../errors.ts";
import { readConfig } from "../../lib/config.ts";
import { resolveProjectPath } from "../../lib/project-finder.ts";
import { getGlobalOptions } from "../../lib/command-utils.ts";
import { readAllMilestones } from "../../lib/milestone-reader.ts";
import { readAllIssues } from "../../lib/issue-reader.ts";
import { enrichMilestone } from "../../lib/milestone-computed.ts";
import { parseCommaSeparated } from "../../lib/validators.ts";
import { printSuccess, printError, printTable, getFormat, verboseLog } from "../../output.ts";
import { formatTable, MILESTONE_TABLE_COLUMNS } from "../../lib/table.ts";
import type { Milestone } from "../../types.ts";

export function registerMilestoneListCommand(milestoneCmd: Command): void {
  milestoneCmd
    .command("list")
    .description("List milestones with filtering and sorting")
    .option("-s, --status <statuses>", "Comma-separated status filter")
    .option("--priority <priority>", "Priority filter")
    .option("-l, --labels <labels>", "Comma-separated labels filter")
    .option("--overdue <bool>", "true for overdue only, false for not overdue")
    .option("--sort <field>", "Sort field: id, title, status, priority, created, updated, dueDate, completion", "id")
    .option("--order <order>", "Sort order: asc, desc", "asc")
    .action(async (options, cmd) => {
      try {
        const globals = getGlobalOptions(cmd);
        const projectPath = await resolveProjectPath(globals.projectPath);
        const config = await readConfig(projectPath);

        verboseLog(`Reading milestones from ${projectPath}`);

        const rawMilestones = await readAllMilestones(projectPath, config);
        const allIssues = await readAllIssues(projectPath, config);
        const allEnriched = rawMilestones.map((m) => enrichMilestone(m, allIssues, config));

        // Filter
        let filtered = allEnriched;

        if (options.status) {
          const statuses = parseCommaSeparated(options.status).map((s) => s.toLowerCase());
          filtered = filtered.filter((m) => statuses.includes(m.status.toLowerCase()));
        }

        if (options.priority) {
          filtered = filtered.filter((m) => m.priority.toLowerCase() === options.priority.toLowerCase());
        }

        if (options.labels) {
          const labels = parseCommaSeparated(options.labels).map((l) => l.toLowerCase());
          filtered = filtered.filter((m) =>
            labels.some((fl) => m.labels.some((ml) => ml.toLowerCase() === fl)),
          );
        }

        if (options.overdue !== undefined) {
          const wantOverdue = options.overdue === "true";
          filtered = filtered.filter((m) => m.isOverdue === wantOverdue);
        }

        // Sort
        const sorted = sortMilestones(filtered, options.sort, options.order);

        // Strip content and log from list output
        const output = sorted.map(({ content, log, filePath, ...rest }) => rest);

        if (getFormat() === "table") {
          printTable(formatTable(output as Record<string, unknown>[], MILESTONE_TABLE_COLUMNS));
          printTable(`\nTotal: ${output.length}`);
        } else {
          printSuccess({
            milestones: output,
            total: output.length,
          });
        }
      } catch (err) {
        printError(err);
        process.exit(err instanceof MdpError ? err.exitCode : 1);
      }
    });
}

type MilestoneSortField = "id" | "title" | "status" | "priority" | "created" | "updated" | "dueDate" | "completion";

function sortMilestones(milestones: Milestone[], field: MilestoneSortField = "id", order: "asc" | "desc" = "asc"): Milestone[] {
  const sorted = [...milestones].sort((a, b) => {
    let cmp = 0;
    switch (field) {
      case "id":
        cmp = a.id.localeCompare(b.id);
        break;
      case "title":
        cmp = a.title.localeCompare(b.title);
        break;
      case "status":
        cmp = a.status.localeCompare(b.status);
        break;
      case "priority":
        cmp = a.priority.localeCompare(b.priority);
        break;
      case "created":
        cmp = a.createdAt.localeCompare(b.createdAt);
        break;
      case "updated":
        cmp = a.updatedAt.localeCompare(b.updatedAt);
        break;
      case "dueDate":
        cmp = (a.dueDate ?? "").localeCompare(b.dueDate ?? "");
        break;
      case "completion":
        cmp = a.completionPercentage - b.completionPercentage;
        break;
    }
    return cmp;
  });

  if (order === "desc") sorted.reverse();
  return sorted;
}
