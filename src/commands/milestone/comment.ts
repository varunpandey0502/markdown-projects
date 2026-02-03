import type { Command } from "commander";
import { MdpError, milestoneNotFound, missingRequired } from "../../errors.ts";
import { readConfig } from "../../lib/config.ts";
import { resolveProjectPath } from "../../lib/project-finder.ts";
import { getGlobalOptions } from "../../lib/command-utils.ts";
import { readAllMilestones, findMilestoneAbsolutePath } from "../../lib/milestone-reader.ts";
import { buildMarkdown, parseMarkdown } from "../../lib/frontmatter.ts";
import { readText, writeText } from "../../lib/fs-utils.ts";
import { printSuccess, printError, verboseLog } from "../../output.ts";
import type { LogEntry } from "../../types.ts";

export function registerMilestoneCommentCommand(milestoneCmd: Command): void {
  milestoneCmd
    .command("comment")
    .description("Add a comment (log entry) to a milestone")
    .requiredOption("--id <id>", "Milestone ID")
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

        verboseLog(`Adding comment to milestone ${options.id}`);

        const allMilestones = await readAllMilestones(projectPath, config);
        const rawMilestone = allMilestones.find(
          (m) => m.id.toLowerCase() === options.id.toLowerCase(),
        );

        if (!rawMilestone) {
          throw milestoneNotFound(options.id, projectPath);
        }

        const now = new Date().toISOString();

        const newEntry: LogEntry = {
          timestamp: now,
          author: options.author,
          body: options.body,
        };

        const absolutePath = findMilestoneAbsolutePath(projectPath, rawMilestone.filePath);
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
            id: rawMilestone.id,
            comment: newEntry,
            totalComments: currentLog.length,
          });
          return;
        }

        const markdown = buildMarkdown(fm, parsed.content);
        await writeText(absolutePath, markdown);

        verboseLog(`Added comment to ${absolutePath}`);

        printSuccess({
          id: rawMilestone.id,
          comment: newEntry,
          totalComments: currentLog.length,
          filePath: rawMilestone.filePath,
        });
      } catch (err) {
        printError(err);
        process.exit(err instanceof MdpError ? err.exitCode : 1);
      }
    });
}
