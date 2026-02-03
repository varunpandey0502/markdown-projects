import type { Command } from "commander";
import { MdpError, issueNotFound, missingRequired } from "../../errors.ts";
import { readConfig } from "../../lib/config.ts";
import { resolveProjectPath } from "../../lib/project-finder.ts";
import { getGlobalOptions } from "../../lib/command-utils.ts";
import { readAllIssues, findIssueAbsolutePath } from "../../lib/issue-reader.ts";
import { buildMarkdown, parseMarkdown } from "../../lib/frontmatter.ts";
import { readText, writeText } from "../../lib/fs-utils.ts";
import { printSuccess, printError, verboseLog } from "../../output.ts";
import type { LogEntry } from "../../types.ts";

export function registerIssueCommentCommand(issueCmd: Command): void {
  issueCmd
    .command("comment")
    .description("Add a comment (log entry) to an issue")
    .requiredOption("--id <id>", "Issue ID")
    .option("--author <author>", "Comment author", "cli")
    .option("-b, --body <body>", "Comment body text")
    .option("--dry-run", "Preview without writing", false)
    .action(async (options, cmd) => {
      try {
        const globals = getGlobalOptions(cmd);
        const projectPath = await resolveProjectPath(globals.projectPath);
        const config = await readConfig(projectPath);

        if (!options.body) {
          throw missingRequired("body");
        }

        verboseLog(`Adding comment to issue ${options.id}`);

        const allIssues = await readAllIssues(projectPath, config);
        const rawIssue = allIssues.find(
          (i) => i.id.toLowerCase() === options.id.toLowerCase(),
        );

        if (!rawIssue) {
          throw issueNotFound(options.id, projectPath);
        }

        const now = new Date().toISOString();

        const newEntry: LogEntry = {
          timestamp: now,
          author: options.author,
          body: options.body,
        };

        // Read and update
        const absolutePath = findIssueAbsolutePath(projectPath, rawIssue.filePath);
        const rawContent = await readText(absolutePath);
        const parsed = parseMarkdown(rawContent);
        const fm = { ...parsed.frontmatter };

        const currentLog = Array.isArray(fm.log) ? [...(fm.log as LogEntry[])] : [];
        currentLog.push(newEntry);
        fm.log = currentLog;
        fm.updatedAt = now;

        if (options.dryRun) {
          printSuccess({
            dryRun: true,
            id: rawIssue.id,
            comment: newEntry,
            totalComments: currentLog.length,
          });
          return;
        }

        const markdown = buildMarkdown(fm, parsed.content);
        await writeText(absolutePath, markdown);

        verboseLog(`Added comment to ${absolutePath}`);

        printSuccess({
          id: rawIssue.id,
          comment: newEntry,
          totalComments: currentLog.length,
          filePath: rawIssue.filePath,
        });
      } catch (err) {
        printError(err);
        process.exit(err instanceof MdpError ? err.exitCode : 1);
      }
    });
}
