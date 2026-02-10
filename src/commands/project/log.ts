import type { Command } from "commander";
import { MdpError } from "../../errors.ts";
import { resolveProjectPath } from "../../lib/project-finder.ts";
import { getGlobalOptions } from "../../lib/command-utils.ts";
import { getProjectMdPath } from "../../lib/settings.ts";
import { PROJECT_DIR, PROJECT_MD } from "../../constants.ts";
import { printSuccess, printError, verboseLog } from "../../output.ts";
import type { LogEntityContext } from "../../lib/log-operations.ts";
import {
  addLogEntry,
  listLogEntries,
  getLogEntry,
  updateLogEntry,
  deleteLogEntry,
} from "../../lib/log-operations.ts";
import type { ProjectHealth } from "../../types.ts";

const VALID_HEALTH = ["on-track", "at-risk", "off-track"];

function resolveProjectLogContext(projectPath: string): LogEntityContext {
  return {
    id: "project",
    filePath: `${PROJECT_DIR}/${PROJECT_MD}`,
    absolutePath: getProjectMdPath(projectPath),
  };
}

export function registerProjectLogCommand(projectCmd: Command): void {
  const logCmd = projectCmd
    .command("log")
    .description("Manage log entries on a project");

  logCmd
    .command("add")
    .description("Add a log entry to the project")
    .option("--author <author>", "Entry author", "cli")
    .option("-b, --body <body>", "Entry body text")
    .option("--health <health>", "Project health: on-track, at-risk, off-track")
    .option("--dry-run", "Preview without writing", false)
    .action(async (options, cmd) => {
      try {
        const globals = getGlobalOptions(cmd);
        const projectPath = await resolveProjectPath(globals.projectPath);
        verboseLog("Adding log entry to project");
        const ctx = resolveProjectLogContext(projectPath);

        const extraFields: Record<string, unknown> = {};
        const extraFmUpdates: Record<string, unknown> = {};
        if (options.health) {
          if (!VALID_HEALTH.includes(options.health)) {
            throw new MdpError("INVALID_INPUT", `Invalid health value "${options.health}". Valid: ${VALID_HEALTH.join(", ")}`, { health: options.health });
          }
          extraFields.health = options.health as ProjectHealth;
          extraFmUpdates.health = options.health as ProjectHealth;
        }

        const result = await addLogEntry(ctx, options.author, options.body, options.dryRun, extraFields, extraFmUpdates);
        printSuccess({
          ...(options.dryRun ? { dryRun: true } : {}),
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
    .description("List all log entries for the project")
    .action(async (_options, cmd) => {
      try {
        const globals = getGlobalOptions(cmd);
        const projectPath = await resolveProjectPath(globals.projectPath);
        verboseLog("Listing project log entries");
        const ctx = resolveProjectLogContext(projectPath);
        const result = await listLogEntries(ctx);
        printSuccess({
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
    .requiredOption("--index <n>", "Log entry index (0-based)")
    .action(async (options, cmd) => {
      try {
        const globals = getGlobalOptions(cmd);
        const projectPath = await resolveProjectPath(globals.projectPath);
        const index = parseInt(options.index, 10);
        verboseLog(`Getting project log entry ${index}`);
        const ctx = resolveProjectLogContext(projectPath);
        const result = await getLogEntry(ctx, index);
        printSuccess({
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
    .requiredOption("--index <n>", "Log entry index (0-based)")
    .option("--author <author>", "New author")
    .option("-b, --body <body>", "New body text")
    .option("--health <health>", "Project health: on-track, at-risk, off-track")
    .option("--dry-run", "Preview without writing", false)
    .action(async (options, cmd) => {
      try {
        const globals = getGlobalOptions(cmd);
        const projectPath = await resolveProjectPath(globals.projectPath);
        const index = parseInt(options.index, 10);
        verboseLog(`Updating project log entry ${index}`);
        const ctx = resolveProjectLogContext(projectPath);

        const extraFields: Record<string, unknown> = {};
        const extraFmUpdates: Record<string, unknown> = {};
        if (options.health) {
          if (!VALID_HEALTH.includes(options.health)) {
            throw new MdpError("INVALID_INPUT", `Invalid health value "${options.health}". Valid: ${VALID_HEALTH.join(", ")}`, { health: options.health });
          }
          extraFields.health = options.health as ProjectHealth;
          extraFmUpdates.health = options.health as ProjectHealth;
        }

        const result = await updateLogEntry(ctx, index, {
          author: options.author,
          body: options.body,
        }, options.dryRun, extraFields, extraFmUpdates);
        printSuccess({
          ...(options.dryRun ? { dryRun: true } : {}),
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
    .requiredOption("--index <n>", "Log entry index (0-based)")
    .option("--dry-run", "Preview without writing", false)
    .action(async (options, cmd) => {
      try {
        const globals = getGlobalOptions(cmd);
        const projectPath = await resolveProjectPath(globals.projectPath);
        const index = parseInt(options.index, 10);
        verboseLog(`Deleting project log entry ${index}`);
        const ctx = resolveProjectLogContext(projectPath);
        const result = await deleteLogEntry(ctx, index, options.dryRun);
        printSuccess({
          ...(options.dryRun ? { dryRun: true } : {}),
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
