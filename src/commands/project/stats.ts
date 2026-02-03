import type { Command } from "commander";
import { MdpError } from "../../errors.ts";
import { readConfig } from "../../lib/config.ts";
import { resolveProjectPath } from "../../lib/project-finder.ts";
import { getGlobalOptions } from "../../lib/command-utils.ts";
import { readAllIssues } from "../../lib/issue-reader.ts";
import { readAllMilestones } from "../../lib/milestone-reader.ts";
import { printSuccess, printError, printTable, getFormat, verboseLog } from "../../output.ts";
import { formatTable, STATS_SECTION_COLUMNS } from "../../lib/table.ts";

export function registerStatsCommand(program: Command): void {
  program
    .command("stats")
    .description("Show project statistics")
    .action(async (_options, cmd) => {
      try {
        const globals = getGlobalOptions(cmd);
        const projectPath = await resolveProjectPath(globals.projectPath);
        const config = await readConfig(projectPath);

        verboseLog(`Computing stats for ${projectPath}`);

        const allIssues = await readAllIssues(projectPath, config);
        const allMilestones = await readAllMilestones(projectPath, config);

        // By status
        const byStatus: Record<string, number> = {};
        for (const status of config.issues.statuses) {
          byStatus[status.name] = 0;
        }
        for (const issue of allIssues) {
          byStatus[issue.status] = (byStatus[issue.status] ?? 0) + 1;
        }

        // By priority
        const byPriority: Record<string, number> = {};
        for (const p of config.issues.priorities) {
          byPriority[p.name] = 0;
        }
        for (const issue of allIssues) {
          byPriority[issue.priority] = (byPriority[issue.priority] ?? 0) + 1;
        }

        // By type
        const byType: Record<string, number> = {};
        for (const t of config.issues.types) {
          byType[t.name] = 0;
        }
        for (const issue of allIssues) {
          byType[issue.type] = (byType[issue.type] ?? 0) + 1;
        }

        // By label
        const byLabel: Record<string, number> = {};
        for (const issue of allIssues) {
          for (const label of issue.labels) {
            byLabel[label] = (byLabel[label] ?? 0) + 1;
          }
        }

        // By assignee
        const byAssignee: Record<string, number> = {};
        for (const issue of allIssues) {
          const assignee = issue.assignee ?? "unassigned";
          byAssignee[assignee] = (byAssignee[assignee] ?? 0) + 1;
        }

        // Estimates
        const totalEstimate = allIssues.reduce((sum, i) => sum + (i.estimate ?? 0), 0);
        const totalSpent = allIssues.reduce((sum, i) => sum + (i.spent ?? 0), 0);

        // Blocked count
        const blockedCount = allIssues.filter((i) => i.blockedBy.length > 0).length;

        // Overdue (issues with dueDate before today that aren't done)
        const today = new Date().toISOString().split("T")[0]!;
        const doneStatuses = config.issues.statuses
          .filter((s) => /^(done|completed|closed)$/i.test(s.name))
          .map((s) => s.name.toLowerCase());
        const overdueCount = allIssues.filter(
          (i) => i.dueDate && i.dueDate < today && !doneStatuses.includes(i.status.toLowerCase()),
        ).length;

        // Milestone stats
        const milestoneByStatus: Record<string, number> = {};
        for (const s of config.milestones.statuses) {
          milestoneByStatus[s.name] = 0;
        }
        for (const m of allMilestones) {
          milestoneByStatus[m.status] = (milestoneByStatus[m.status] ?? 0) + 1;
        }

        const statsData = {
          issues: {
            total: allIssues.length,
            byStatus,
            byPriority,
            byType,
            byLabel,
            byAssignee,
            blocked: blockedCount,
            overdue: overdueCount,
            estimateTotal: totalEstimate,
            spentTotal: totalSpent,
          },
          milestones: {
            total: allMilestones.length,
            byStatus: milestoneByStatus,
          },
        };

        if (getFormat() === "table") {
          const toRows = (obj: Record<string, number>) =>
            Object.entries(obj).map(([name, count]) => ({ name, count }));

          printTable(`Issues: ${allIssues.length}  |  Milestones: ${allMilestones.length}  |  Blocked: ${blockedCount}  |  Overdue: ${overdueCount}`);
          printTable(`Estimate: ${totalEstimate}  |  Spent: ${totalSpent}`);
          printTable(`\nBy Status:`);
          printTable(formatTable(toRows(byStatus), STATS_SECTION_COLUMNS));
          printTable(`\nBy Priority:`);
          printTable(formatTable(toRows(byPriority), STATS_SECTION_COLUMNS));
          printTable(`\nBy Type:`);
          printTable(formatTable(toRows(byType), STATS_SECTION_COLUMNS));
          if (Object.keys(byLabel).length > 0) {
            printTable(`\nBy Label:`);
            printTable(formatTable(toRows(byLabel), STATS_SECTION_COLUMNS));
          }
          printTable(`\nBy Assignee:`);
          printTable(formatTable(toRows(byAssignee), STATS_SECTION_COLUMNS));
        } else {
          printSuccess(statsData);
        }
      } catch (err) {
        printError(err);
        process.exit(err instanceof MdpError ? err.exitCode : 1);
      }
    });
}
