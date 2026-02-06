import type { Command } from "commander";
import { MdpError, invalidInput, issueNotFound } from "../../errors.ts";
import { readConfig } from "../../lib/config.ts";
import { resolveProjectPath } from "../../lib/project-finder.ts";
import { getGlobalOptions } from "../../lib/command-utils.ts";
import { readAllIssues, findIssueAbsolutePath } from "../../lib/issue-reader.ts";
import { parseMarkdown } from "../../lib/frontmatter.ts";
import { readText } from "../../lib/fs-utils.ts";
import { readStdin } from "../../lib/stdin.ts";
import { applyIssueUpdate, writeIssueUpdate } from "../../lib/issue-operations.ts";
import type { BatchItemResult, BatchEnvelope, IssueUpdateInput } from "../../lib/issue-operations.ts";
import { printSuccess, printError, verboseLog } from "../../output.ts";

export function registerIssueBatchUpdateCommand(issueCmd: Command): void {
  issueCmd
    .command("batch-update")
    .description("Update multiple issues from a JSON array on stdin")
    .option("--dry-run", "Preview without writing", false)
    .action(async (_options, cmd) => {
      try {
        const globals = getGlobalOptions(cmd);
        const projectPath = await resolveProjectPath(globals.projectPath);
        const config = await readConfig(projectPath);
        const dryRun = _options.dryRun;

        verboseLog(`Batch-updating issues in ${projectPath}`);

        // Read and parse stdin
        const raw = await readStdin();
        const trimmed = raw.trim();
        if (!trimmed) {
          throw invalidInput("No input received on stdin. Pipe a JSON array of issue updates.");
        }

        let items: unknown[];
        try {
          const parsed = JSON.parse(trimmed);
          if (!Array.isArray(parsed)) {
            throw invalidInput("Input must be a JSON array of issue update objects.");
          }
          items = parsed;
        } catch (err) {
          if (err instanceof MdpError) throw err;
          throw invalidInput(`Invalid JSON: ${(err as Error).message}`);
        }

        if (items.length === 0) {
          throw invalidInput("Input array is empty.");
        }

        // Read all issues once into memory
        const allIssues = await readAllIssues(projectPath, config);

        const results: BatchItemResult<{ id: string; changes: Record<string, unknown>; filePath: string }>[] = [];
        let succeeded = 0;
        let failed = 0;

        for (let i = 0; i < items.length; i++) {
          const item = items[i] as Record<string, unknown>;

          try {
            // Validate required field
            if (!item.id || typeof item.id !== "string") {
              throw invalidInput(`Item at index ${i} is missing required field "id".`, { index: i });
            }

            const issueId = item.id as string;

            // Find the issue in the in-memory list
            const rawIssue = allIssues.find(
              (iss) => iss.id.toLowerCase() === issueId.toLowerCase(),
            );
            if (!rawIssue) {
              throw issueNotFound(issueId, projectPath);
            }

            // Read current file
            const absolutePath = findIssueAbsolutePath(projectPath, rawIssue.filePath);
            const rawContent = await readText(absolutePath);
            const parsed = parseMarkdown(rawContent);

            const input: IssueUpdateInput = {
              id: issueId,
              title: item.title as string | undefined,
              type: item.type as string | undefined,
              status: item.status as string | undefined,
              priority: item.priority as string | undefined,
              labels: item.labels as string[] | string | undefined,
              addLabels: item.addLabels as string[] | string | undefined,
              removeLabels: item.removeLabels as string[] | string | undefined,
              assignee: item.assignee as string | null | undefined,
              milestone: item.milestone as string | null | undefined,
              estimate: item.estimate as number | string | null | undefined,
              spent: item.spent as number | string | null | undefined,
              dueDate: item.dueDate as string | null | undefined,
              blockedBy: item.blockedBy as string[] | string | undefined,
              addBlockedBy: item.addBlockedBy as string[] | string | undefined,
              removeBlockedBy: item.removeBlockedBy as string[] | string | undefined,
              parent: item.parent as string | null | undefined,
              relatedTo: item.relatedTo as string[] | string | undefined,
              addRelatedTo: item.addRelatedTo as string[] | string | undefined,
              removeRelatedTo: item.removeRelatedTo as string[] | string | undefined,
              addChecklist: item.addChecklist as string[] | string | undefined,
              removeChecklist: item.removeChecklist as string[] | string | undefined,
              check: item.check as string[] | string | undefined,
              uncheck: item.uncheck as string[] | string | undefined,
              content: item.content as string | undefined,
            };

            const result = applyIssueUpdate(
              input,
              rawIssue,
              parsed.frontmatter,
              parsed.content,
              config,
              allIssues,
            );

            let filePath = rawIssue.filePath;

            if (!dryRun) {
              const writeResult = await writeIssueUpdate(
                projectPath,
                rawIssue,
                result.frontmatter,
                result.content,
                config,
                result.statusChanged,
                result.titleChanged,
              );
              filePath = writeResult.filePath;

              // Update the in-memory rawIssue to reflect changes for subsequent items
              // This is critical for accurate cycle detection and ID lookups
              if (result.statusChanged) {
                rawIssue.status = result.frontmatter.status as string;
              }
              if (result.titleChanged) {
                rawIssue.title = result.frontmatter.title as string;
              }
              rawIssue.filePath = filePath;
              rawIssue.blockedBy = (result.frontmatter.blockedBy as string[]) ?? [];
              rawIssue.labels = (result.frontmatter.labels as string[]) ?? [];
              rawIssue.relatedTo = (result.frontmatter.relatedTo as string[]) ?? [];
              if (result.frontmatter.assignee !== undefined) {
                rawIssue.assignee = result.frontmatter.assignee as string | null;
              }
              if (result.frontmatter.milestone !== undefined) {
                rawIssue.milestone = result.frontmatter.milestone as string | null;
              }
              if (result.frontmatter.priority !== undefined) {
                rawIssue.priority = result.frontmatter.priority as string;
              }
              if (result.frontmatter.parent !== undefined) {
                rawIssue.parent = result.frontmatter.parent as string | null;
              }
            }

            verboseLog(`Updated issue ${issueId}`);

            results.push({
              ok: true,
              data: {
                id: rawIssue.id,
                changes: result.changes,
                filePath,
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

        const envelope: BatchEnvelope<{ id: string; changes: Record<string, unknown>; filePath: string }> = {
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
