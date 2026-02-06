import type { Command } from "commander";
import { MdpError, milestoneNotFound } from "../../errors.ts";
import { readConfig } from "../../lib/config.ts";
import { resolveProjectPath } from "../../lib/project-finder.ts";
import { getGlobalOptions } from "../../lib/command-utils.ts";
import { readAllMilestones, findMilestoneAbsolutePath } from "../../lib/milestone-reader.ts";
import { printSuccess, printError, verboseLog } from "../../output.ts";
import type { LogEntityContext } from "../../lib/log-operations.ts";
import {
  addLogEntry,
  listLogEntries,
  getLogEntry,
  updateLogEntry,
  deleteLogEntry,
} from "../../lib/log-operations.ts";

async function resolveMilestoneContext(
  id: string,
  projectPath: string,
): Promise<LogEntityContext & { filePath: string }> {
  const config = await readConfig(projectPath);
  const allMilestones = await readAllMilestones(projectPath, config);
  const rawMilestone = allMilestones.find(
    (m) => m.id.toLowerCase() === id.toLowerCase(),
  );
  if (!rawMilestone) throw milestoneNotFound(id, projectPath);

  return {
    id: rawMilestone.id,
    filePath: rawMilestone.filePath,
    absolutePath: findMilestoneAbsolutePath(projectPath, rawMilestone.filePath),
  };
}

export function registerMilestoneLogCommand(milestoneCmd: Command): void {
  const logCmd = milestoneCmd
    .command("log")
    .description("Manage log entries on a milestone");

  logCmd
    .command("add")
    .description("Add a log entry to a milestone")
    .requiredOption("--id <id>", "Milestone ID")
    .option("--author <author>", "Entry author", "cli")
    .option("-b, --body <body>", "Entry body text")
    .option("--dry-run", "Preview without writing", false)
    .action(async (options, cmd) => {
      try {
        const globals = getGlobalOptions(cmd);
        const projectPath = await resolveProjectPath(globals.projectPath);
        verboseLog(`Adding log entry to milestone ${options.id}`);
        const ctx = await resolveMilestoneContext(options.id, projectPath);
        const result = await addLogEntry(ctx, options.author, options.body, options.dryRun);
        printSuccess({
          ...(options.dryRun ? { dryRun: true } : {}),
          id: ctx.id,
          entry: result.entry,
          totalEntries: result.totalEntries,
          ...(!options.dryRun ? { filePath: ctx.filePath } : {}),
        });
      } catch (err) {
        printError(err);
        process.exit(err instanceof MdpError ? err.exitCode : 1);
      }
    });

  logCmd
    .command("list")
    .description("List all log entries for a milestone")
    .requiredOption("--id <id>", "Milestone ID")
    .action(async (options, cmd) => {
      try {
        const globals = getGlobalOptions(cmd);
        const projectPath = await resolveProjectPath(globals.projectPath);
        verboseLog(`Listing log entries for milestone ${options.id}`);
        const ctx = await resolveMilestoneContext(options.id, projectPath);
        const result = await listLogEntries(ctx);
        printSuccess({
          id: ctx.id,
          entries: result.entries,
          totalEntries: result.totalEntries,
        });
      } catch (err) {
        printError(err);
        process.exit(err instanceof MdpError ? err.exitCode : 1);
      }
    });

  logCmd
    .command("get")
    .description("Get a specific log entry by index")
    .requiredOption("--id <id>", "Milestone ID")
    .requiredOption("--index <n>", "Log entry index (0-based)")
    .action(async (options, cmd) => {
      try {
        const globals = getGlobalOptions(cmd);
        const projectPath = await resolveProjectPath(globals.projectPath);
        const index = parseInt(options.index, 10);
        verboseLog(`Getting log entry ${index} for milestone ${options.id}`);
        const ctx = await resolveMilestoneContext(options.id, projectPath);
        const result = await getLogEntry(ctx, index);
        printSuccess({
          id: ctx.id,
          index: result.index,
          entry: result.entry,
        });
      } catch (err) {
        printError(err);
        process.exit(err instanceof MdpError ? err.exitCode : 1);
      }
    });

  logCmd
    .command("update")
    .description("Update a log entry by index")
    .requiredOption("--id <id>", "Milestone ID")
    .requiredOption("--index <n>", "Log entry index (0-based)")
    .option("--author <author>", "New author")
    .option("-b, --body <body>", "New body text")
    .option("--dry-run", "Preview without writing", false)
    .action(async (options, cmd) => {
      try {
        const globals = getGlobalOptions(cmd);
        const projectPath = await resolveProjectPath(globals.projectPath);
        const index = parseInt(options.index, 10);
        verboseLog(`Updating log entry ${index} for milestone ${options.id}`);
        const ctx = await resolveMilestoneContext(options.id, projectPath);
        const result = await updateLogEntry(ctx, index, {
          author: options.author,
          body: options.body,
        }, options.dryRun);
        printSuccess({
          ...(options.dryRun ? { dryRun: true } : {}),
          id: ctx.id,
          index: result.index,
          entry: result.entry,
          changes: result.changes,
          ...(!options.dryRun ? { filePath: ctx.filePath } : {}),
        });
      } catch (err) {
        printError(err);
        process.exit(err instanceof MdpError ? err.exitCode : 1);
      }
    });

  logCmd
    .command("delete")
    .description("Delete a log entry by index")
    .requiredOption("--id <id>", "Milestone ID")
    .requiredOption("--index <n>", "Log entry index (0-based)")
    .option("--dry-run", "Preview without writing", false)
    .action(async (options, cmd) => {
      try {
        const globals = getGlobalOptions(cmd);
        const projectPath = await resolveProjectPath(globals.projectPath);
        const index = parseInt(options.index, 10);
        verboseLog(`Deleting log entry ${index} for milestone ${options.id}`);
        const ctx = await resolveMilestoneContext(options.id, projectPath);
        const result = await deleteLogEntry(ctx, index, options.dryRun);
        printSuccess({
          ...(options.dryRun ? { dryRun: true } : {}),
          id: ctx.id,
          index: result.index,
          deletedEntry: result.deletedEntry,
          remainingEntries: result.remainingEntries,
          ...(!options.dryRun ? { filePath: ctx.filePath } : {}),
        });
      } catch (err) {
        printError(err);
        process.exit(err instanceof MdpError ? err.exitCode : 1);
      }
    });
}
