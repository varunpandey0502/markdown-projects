import type { Command } from "commander";
import { MdpError, invalidInput } from "../../errors.ts";
import { readConfig } from "../../lib/config.ts";
import { resolveProjectPath } from "../../lib/project-finder.ts";
import { getGlobalOptions } from "../../lib/command-utils.ts";
import { getNextId, parseIdNumber, formatId } from "../../lib/id.ts";
import { readStdin } from "../../lib/stdin.ts";
import { prepareIssueCreate, writeIssueCreate } from "../../lib/issue-operations.ts";
import type { BatchItemResult, BatchEnvelope, IssueCreateInput } from "../../lib/issue-operations.ts";
import { printSuccess, printError, verboseLog } from "../../output.ts";

export function registerIssueBatchCreateCommand(issueCmd: Command): void {
  issueCmd
    .command("batch-create")
    .description("Create multiple issues from a JSON array on stdin")
    .option("--dry-run", "Preview without creating", false)
    .action(async (_options, cmd) => {
      try {
        const globals = getGlobalOptions(cmd);
        const projectPath = await resolveProjectPath(globals.projectPath);
        const config = await readConfig(projectPath);
        const dryRun = _options.dryRun;

        verboseLog(`Batch-creating issues in ${projectPath}`);

        // Read and parse stdin
        const raw = await readStdin();
        const trimmed = raw.trim();
        if (!trimmed) {
          throw invalidInput("No input received on stdin. Pipe a JSON array of issues.");
        }

        let items: unknown[];
        try {
          const parsed = JSON.parse(trimmed);
          if (!Array.isArray(parsed)) {
            throw invalidInput("Input must be a JSON array of issue objects.");
          }
          items = parsed;
        } catch (err) {
          if (err instanceof MdpError) throw err;
          throw invalidInput(`Invalid JSON: ${(err as Error).message}`);
        }

        if (items.length === 0) {
          throw invalidInput("Input array is empty.");
        }

        // Generate IDs: get next ID once, then increment
        let baseNum: number;
        if (dryRun) {
          baseNum = 0;
        } else {
          const firstId = await getNextId(projectPath, config.issues.prefix, "issues");
          baseNum = parseIdNumber(firstId);
        }

        const results: BatchItemResult<{ id: string; title: string; filePath: string }>[] = [];
        let succeeded = 0;
        let failed = 0;

        for (let i = 0; i < items.length; i++) {
          const item = items[i] as Record<string, unknown>;

          try {
            // Validate required field
            if (!item.title || typeof item.title !== "string") {
              throw invalidInput(`Item at index ${i} is missing required field "title".`, { index: i });
            }

            const id = dryRun
              ? `${config.issues.prefix}-XXX`
              : formatId(config.issues.prefix, baseNum + i);

            const input: IssueCreateInput = {
              title: item.title as string,
              type: item.type as string | undefined,
              status: item.status as string | undefined,
              priority: item.priority as string | undefined,
              labels: item.labels as string[] | string | undefined,
              assignee: item.assignee as string | null | undefined,
              milestone: item.milestone as string | null | undefined,
              estimate: item.estimate as number | string | null | undefined,
              spent: item.spent as number | string | null | undefined,
              dueDate: item.dueDate as string | null | undefined,
              blockedBy: item.blockedBy as string[] | string | undefined,
              parent: item.parent as string | null | undefined,
              relatedTo: item.relatedTo as string[] | string | undefined,
              checklist: item.checklist as string[] | string | undefined,
              description: item.description as string | undefined,
              content: item.content as string | undefined,
              template: item.template as string | undefined,
            };

            const prepared = await prepareIssueCreate(input, config, projectPath, id);

            if (!dryRun) {
              await writeIssueCreate(projectPath, prepared);
            }

            verboseLog(`Created issue ${id}: ${input.title}`);

            results.push({
              ok: true,
              data: {
                id,
                title: input.title,
                filePath: prepared.filePath,
              },
            });
            succeeded++;
          } catch (err) {
            failed++;
            const mdpErr = err instanceof MdpError ? err : new MdpError("UNKNOWN_ERROR", (err as Error).message);
            results.push({
              ok: false,
              error: {
                code: mdpErr.code,
                message: mdpErr.message,
                index: i,
                details: mdpErr.details,
              },
            });
          }
        }

        const envelope: BatchEnvelope<{ id: string; title: string; filePath: string }> = {
          total: items.length,
          succeeded,
          failed,
          results,
        };

        printSuccess(envelope);

        if (failed > 0) {
          process.exit(1);
        }
      } catch (err) {
        printError(err);
        process.exit(err instanceof MdpError ? err.exitCode : 1);
      }
    });
}
