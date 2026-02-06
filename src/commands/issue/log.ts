import type { Command } from "commander";
import { MdpError, issueNotFound } from "../../errors.ts";
import { readConfig } from "../../lib/config.ts";
import { resolveProjectPath } from "../../lib/project-finder.ts";
import { getGlobalOptions } from "../../lib/command-utils.ts";
import { readAllIssues, findIssueAbsolutePath } from "../../lib/issue-reader.ts";
import { printSuccess, printError, verboseLog } from "../../output.ts";
import type { LogEntityContext } from "../../lib/log-operations.ts";
import {
  addLogEntry,
  listLogEntries,
  getLogEntry,
  updateLogEntry,
  deleteLogEntry,
} from "../../lib/log-operations.ts";

async function resolveIssueContext(
  id: string,
  projectPath: string,
): Promise<LogEntityContext & { filePath: string }> {
  const config = await readConfig(projectPath);
  const allIssues = await readAllIssues(projectPath, config);
  const rawIssue = allIssues.find(
    (i) => i.id.toLowerCase() === id.toLowerCase(),
  );
  if (!rawIssue) throw issueNotFound(id, projectPath);

  return {
    id: rawIssue.id,
    filePath: rawIssue.filePath,
    absolutePath: findIssueAbsolutePath(projectPath, rawIssue.filePath),
  };
}

export function registerIssueLogCommand(issueCmd: Command): void {
  const logCmd = issueCmd
    .command("log")
    .description("Manage log entries on an issue");

  logCmd
    .command("add")
    .description("Add a log entry to an issue")
    .requiredOption("--id <id>", "Issue ID")
    .option("--author <author>", "Entry author", "cli")
    .option("-b, --body <body>", "Entry body text")
    .option("--dry-run", "Preview without writing", false)
    .action(async (options, cmd) => {
      try {
        const globals = getGlobalOptions(cmd);
        const projectPath = await resolveProjectPath(globals.projectPath);
        verboseLog(`Adding log entry to issue ${options.id}`);
        const ctx = await resolveIssueContext(options.id, projectPath);
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
    .description("List all log entries for an issue")
    .requiredOption("--id <id>", "Issue ID")
    .action(async (options, cmd) => {
      try {
        const globals = getGlobalOptions(cmd);
        const projectPath = await resolveProjectPath(globals.projectPath);
        verboseLog(`Listing log entries for issue ${options.id}`);
        const ctx = await resolveIssueContext(options.id, projectPath);
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
    .requiredOption("--id <id>", "Issue ID")
    .requiredOption("--index <n>", "Log entry index (0-based)")
    .action(async (options, cmd) => {
      try {
        const globals = getGlobalOptions(cmd);
        const projectPath = await resolveProjectPath(globals.projectPath);
        const index = parseInt(options.index, 10);
        verboseLog(`Getting log entry ${index} for issue ${options.id}`);
        const ctx = await resolveIssueContext(options.id, projectPath);
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
    .requiredOption("--id <id>", "Issue ID")
    .requiredOption("--index <n>", "Log entry index (0-based)")
    .option("--author <author>", "New author")
    .option("-b, --body <body>", "New body text")
    .option("--dry-run", "Preview without writing", false)
    .action(async (options, cmd) => {
      try {
        const globals = getGlobalOptions(cmd);
        const projectPath = await resolveProjectPath(globals.projectPath);
        const index = parseInt(options.index, 10);
        verboseLog(`Updating log entry ${index} for issue ${options.id}`);
        const ctx = await resolveIssueContext(options.id, projectPath);
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
    .requiredOption("--id <id>", "Issue ID")
    .requiredOption("--index <n>", "Log entry index (0-based)")
    .option("--dry-run", "Preview without writing", false)
    .action(async (options, cmd) => {
      try {
        const globals = getGlobalOptions(cmd);
        const projectPath = await resolveProjectPath(globals.projectPath);
        const index = parseInt(options.index, 10);
        verboseLog(`Deleting log entry ${index} for issue ${options.id}`);
        const ctx = await resolveIssueContext(options.id, projectPath);
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
