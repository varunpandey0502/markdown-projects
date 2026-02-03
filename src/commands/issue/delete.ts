import type { Command } from "commander";
import { MdpError, issueNotFound } from "../../errors.ts";
import { readConfig } from "../../lib/config.ts";
import { resolveProjectPath } from "../../lib/project-finder.ts";
import { getGlobalOptions } from "../../lib/command-utils.ts";
import { readAllIssues, findIssueAbsolutePath } from "../../lib/issue-reader.ts";
import { buildMarkdown, parseMarkdown } from "../../lib/frontmatter.ts";
import { readText, writeText, removeDir } from "../../lib/fs-utils.ts";
import { printSuccess, printError, verboseLog } from "../../output.ts";
import { dirname } from "node:path";

export function registerIssueDeleteCommand(issueCmd: Command): void {
  issueCmd
    .command("delete")
    .description("Delete an issue and clean up references")
    .requiredOption("--id <id>", "Issue ID to delete")
    .option("--dry-run", "Preview without deleting", false)
    .action(async (options, cmd) => {
      try {
        const globals = getGlobalOptions(cmd);
        const projectPath = await resolveProjectPath(globals.projectPath);
        const config = await readConfig(projectPath);

        verboseLog(`Deleting issue ${options.id} from ${projectPath}`);

        const allIssues = await readAllIssues(projectPath, config);
        const targetIssue = allIssues.find(
          (i) => i.id.toLowerCase() === options.id.toLowerCase(),
        );

        if (!targetIssue) {
          throw issueNotFound(options.id, projectPath);
        }

        // Find issues that reference this one
        const referencingIssues: Array<{ id: string; field: string }> = [];
        for (const issue of allIssues) {
          if (issue.id === targetIssue.id) continue;

          if (issue.blockedBy.some((b) => b.toLowerCase() === targetIssue.id.toLowerCase())) {
            referencingIssues.push({ id: issue.id, field: "blockedBy" });
          }
          if (issue.relatedTo.some((r) => r.toLowerCase() === targetIssue.id.toLowerCase())) {
            referencingIssues.push({ id: issue.id, field: "relatedTo" });
          }
          if (issue.parent?.toLowerCase() === targetIssue.id.toLowerCase()) {
            referencingIssues.push({ id: issue.id, field: "parent" });
          }
        }

        if (options.dryRun) {
          printSuccess({
            dryRun: true,
            id: targetIssue.id,
            filePath: targetIssue.filePath,
            referencesCleanedUp: referencingIssues,
          });
          return;
        }

        // Clean up references in other issues
        for (const ref of referencingIssues) {
          const refIssue = allIssues.find((i) => i.id === ref.id)!;
          const absPath = findIssueAbsolutePath(projectPath, refIssue.filePath);
          const raw = await readText(absPath);
          const parsed = parseMarkdown(raw);
          const fm = { ...parsed.frontmatter };

          if (ref.field === "blockedBy" && Array.isArray(fm.blockedBy)) {
            fm.blockedBy = (fm.blockedBy as string[]).filter(
              (b) => b.toLowerCase() !== targetIssue.id.toLowerCase(),
            );
          }
          if (ref.field === "relatedTo" && Array.isArray(fm.relatedTo)) {
            fm.relatedTo = (fm.relatedTo as string[]).filter(
              (r) => r.toLowerCase() !== targetIssue.id.toLowerCase(),
            );
          }
          if (ref.field === "parent") {
            fm.parent = null;
          }

          fm.updatedAt = new Date().toISOString();

          const markdown = buildMarkdown(fm, parsed.content);
          await writeText(absPath, markdown);
          verboseLog(`Cleaned up ${ref.field} reference in ${ref.id}`);
        }

        // Delete the issue folder
        const absPath = findIssueAbsolutePath(projectPath, targetIssue.filePath);
        const folderPath = dirname(absPath);
        await removeDir(folderPath);
        verboseLog(`Deleted folder ${folderPath}`);

        printSuccess({
          id: targetIssue.id,
          deleted: true,
          filePath: targetIssue.filePath,
          referencesCleanedUp: referencingIssues,
        });
      } catch (err) {
        printError(err);
        process.exit(err instanceof MdpError ? err.exitCode : 1);
      }
    });
}
