import { join } from "node:path";
import type { Command } from "commander";
import { MdpError, issueNotFound } from "../../errors.ts";
import { readConfig, getStatusFolderName } from "../../lib/config.ts";
import { resolveProjectPath } from "../../lib/project-finder.ts";
import { getGlobalOptions } from "../../lib/command-utils.ts";
import { readAllIssues, findIssueAbsolutePath } from "../../lib/issue-reader.ts";
import { buildMarkdown, parseMarkdown } from "../../lib/frontmatter.ts";
import { readText, writeText } from "../../lib/fs-utils.ts";
import { moveIssueFolder } from "../../lib/file-mover.ts";
import { detectCycle } from "../../lib/cycle-detector.ts";
import { validateStatus, validatePriority, validateType, validateLabels, validateDate, parseCommaSeparated, validateEstimate, validateSpent } from "../../lib/validators.ts";

import { printSuccess, printError, verboseLog } from "../../output.ts";
import { circularDependency } from "../../errors.ts";

export function registerIssueUpdateCommand(issueCmd: Command): void {
  issueCmd
    .command("update")
    .description("Update an existing issue")
    .requiredOption("--id <id>", "Issue ID to update")
    .option("-t, --title <title>", "New title")
    .option("--type <type>", "New type")
    .option("-s, --status <status>", "New status")
    .option("--priority <priority>", "New priority")
    .option("-l, --labels <labels>", "Set labels (comma-separated, replaces all)")
    .option("--add-labels <labels>", "Add labels (comma-separated)")
    .option("--remove-labels <labels>", "Remove labels (comma-separated)")
    .option("-a, --assignee <assignee>", "Set assignee (use 'none' to clear)")
    .option("-m, --milestone <milestone>", "Set milestone (use 'none' to clear)")
    .option("-e, --estimate <estimate>", "Set estimate (use 'none' to clear)")
    .option("--spent <spent>", "Set spent (use 'none' to clear)")
    .option("--due-date <date>", "Set due date YYYY-MM-DD (use 'none' to clear)")
    .option("--blocked-by <ids>", "Set blockedBy (comma-separated, replaces all)")
    .option("--add-blocked-by <ids>", "Add to blockedBy (comma-separated)")
    .option("--remove-blocked-by <ids>", "Remove from blockedBy (comma-separated)")
    .option("--parent <id>", "Set parent issue (use 'none' to clear)")
    .option("--related-to <ids>", "Set relatedTo (comma-separated, replaces all)")
    .option("--add-related-to <ids>", "Add to relatedTo (comma-separated)")
    .option("--remove-related-to <ids>", "Remove from relatedTo (comma-separated)")
    .option("--add-checklist <items>", "Add checklist items (comma-separated)")
    .option("--remove-checklist <items>", "Remove checklist items by text (comma-separated)")
    .option("--check <items>", "Check items by text (comma-separated)")
    .option("--uncheck <items>", "Uncheck items by text (comma-separated)")
    .option("-c, --content <content>", "Replace markdown body")
    .option("--dry-run", "Preview without writing", false)
    .action(async (options, cmd) => {
      try {
        const globals = getGlobalOptions(cmd);
        const projectPath = await resolveProjectPath(globals.projectPath);
        const config = await readConfig(projectPath);
        const warnings: string[] = [];

        verboseLog(`Updating issue ${options.id} in ${projectPath}`);

        // Find the issue
        const allIssues = await readAllIssues(projectPath, config);
        const rawIssue = allIssues.find(
          (i) => i.id.toLowerCase() === options.id.toLowerCase(),
        );
        if (!rawIssue) {
          throw issueNotFound(options.id, projectPath);
        }

        // Read current file
        const absolutePath = findIssueAbsolutePath(projectPath, rawIssue.filePath);
        const rawContent = await readText(absolutePath);
        const parsed = parseMarkdown(rawContent);
        const fm = { ...parsed.frontmatter };

        // Track what changed for output
        const changes: Record<string, { from: unknown; to: unknown }> = {};

        // ── Simple field updates ──
        if (options.title !== undefined) {
          changes.title = { from: fm.title, to: options.title };
          fm.title = options.title;
        }

        if (options.type !== undefined) {
          const validated = validateType(config.issues.types, options.type);
          changes.type = { from: fm.type, to: validated };
          fm.type = validated;
        }

        if (options.status !== undefined) {
          const validated = validateStatus(config.issues.statuses, options.status);
          changes.status = { from: fm.status, to: validated };
          fm.status = validated;
        }

        if (options.priority !== undefined) {
          const validated = validatePriority(config.issues.priorities, options.priority);
          changes.priority = { from: fm.priority, to: validated };
          fm.priority = validated;
        }

        if (options.assignee !== undefined) {
          const val = options.assignee.toLowerCase() === "none" ? null : options.assignee;
          changes.assignee = { from: fm.assignee, to: val };
          fm.assignee = val;
        }

        if (options.milestone !== undefined) {
          const val = options.milestone.toLowerCase() === "none" ? null : options.milestone;
          changes.milestone = { from: fm.milestone, to: val };
          fm.milestone = val;
        }

        if (options.estimate !== undefined) {
          const val = validateEstimate(options.estimate);
          changes.estimate = { from: fm.estimate, to: val };
          fm.estimate = val;
        }

        if (options.spent !== undefined) {
          const val = validateSpent(options.spent);
          changes.spent = { from: fm.spent, to: val };
          fm.spent = val;
        }

        if (options.dueDate !== undefined) {
          const val = validateDate(options.dueDate) || null;
          changes.dueDate = { from: fm.dueDate, to: val };
          fm.dueDate = val;
        }

        if (options.parent !== undefined) {
          const val = options.parent.toLowerCase() === "none" ? null : options.parent;
          changes.parent = { from: fm.parent, to: val };
          fm.parent = val;
        }

        // ── Labels (set / add / remove) ──
        let currentLabels = Array.isArray(fm.labels) ? [...(fm.labels as string[])] : [];

        if (options.labels !== undefined) {
          const parsed = parseCommaSeparated(options.labels);
          const { validated, warnings: lw } = validateLabels(config.issues.labels, parsed);
          warnings.push(...lw);
          changes.labels = { from: currentLabels, to: validated };
          currentLabels = validated;
        }
        if (options.addLabels) {
          const toAdd = parseCommaSeparated(options.addLabels);
          const { validated, warnings: lw } = validateLabels(config.issues.labels, toAdd);
          warnings.push(...lw);
          const before = [...currentLabels];
          for (const label of validated) {
            if (!currentLabels.some((l) => l.toLowerCase() === label.toLowerCase())) {
              currentLabels.push(label);
            }
          }
          changes.labels = { from: before, to: currentLabels };
        }
        if (options.removeLabels) {
          const toRemove = parseCommaSeparated(options.removeLabels).map((s) => s.toLowerCase());
          const before = [...currentLabels];
          currentLabels = currentLabels.filter((l) => !toRemove.includes(l.toLowerCase()));
          changes.labels = { from: before, to: currentLabels };
        }
        fm.labels = currentLabels;

        // ── BlockedBy (set / add / remove) with cycle detection ──
        let currentBlockedBy = Array.isArray(fm.blockedBy) ? [...(fm.blockedBy as string[])] : [];

        if (options.blockedBy !== undefined) {
          currentBlockedBy = parseCommaSeparated(options.blockedBy);
        }
        if (options.addBlockedBy) {
          const toAdd = parseCommaSeparated(options.addBlockedBy);
          for (const dep of toAdd) {
            if (!currentBlockedBy.some((b) => b.toLowerCase() === dep.toLowerCase())) {
              // Check for cycles
              const cycle = detectCycle(rawIssue.id, dep, allIssues);
              if (cycle) {
                throw circularDependency(rawIssue.id, dep, cycle);
              }
              currentBlockedBy.push(dep);
            }
          }
        }
        if (options.removeBlockedBy) {
          const toRemove = parseCommaSeparated(options.removeBlockedBy).map((s) => s.toLowerCase());
          currentBlockedBy = currentBlockedBy.filter((b) => !toRemove.includes(b.toLowerCase()));
        }
        if (options.blockedBy !== undefined || options.addBlockedBy || options.removeBlockedBy) {
          changes.blockedBy = { from: fm.blockedBy, to: currentBlockedBy };
        }
        fm.blockedBy = currentBlockedBy;

        // ── RelatedTo (set / add / remove) ──
        let currentRelatedTo = Array.isArray(fm.relatedTo) ? [...(fm.relatedTo as string[])] : [];

        if (options.relatedTo !== undefined) {
          currentRelatedTo = parseCommaSeparated(options.relatedTo);
        }
        if (options.addRelatedTo) {
          const toAdd = parseCommaSeparated(options.addRelatedTo);
          for (const rel of toAdd) {
            if (!currentRelatedTo.some((r) => r.toLowerCase() === rel.toLowerCase())) {
              currentRelatedTo.push(rel);
            }
          }
        }
        if (options.removeRelatedTo) {
          const toRemove = parseCommaSeparated(options.removeRelatedTo).map((s) => s.toLowerCase());
          currentRelatedTo = currentRelatedTo.filter((r) => !toRemove.includes(r.toLowerCase()));
        }
        if (options.relatedTo !== undefined || options.addRelatedTo || options.removeRelatedTo) {
          changes.relatedTo = { from: fm.relatedTo, to: currentRelatedTo };
        }
        fm.relatedTo = currentRelatedTo;

        // ── Checklist manipulation ──
        let currentChecklist = Array.isArray(fm.checklist)
          ? (fm.checklist as Array<{ text: string; done: boolean }>).map((c) => ({ ...c }))
          : [];

        if (options.addChecklist) {
          const items = parseCommaSeparated(options.addChecklist);
          for (const text of items) {
            currentChecklist.push({ text, done: false });
          }
          changes.checklist = { from: "modified", to: `added ${items.length} items` };
        }
        if (options.removeChecklist) {
          const toRemove = parseCommaSeparated(options.removeChecklist).map((s) => s.toLowerCase());
          const before = currentChecklist.length;
          currentChecklist = currentChecklist.filter((c) => !toRemove.includes(c.text.toLowerCase()));
          changes.checklist = { from: "modified", to: `removed ${before - currentChecklist.length} items` };
        }
        if (options.check) {
          const toCheck = parseCommaSeparated(options.check).map((s) => s.toLowerCase());
          for (const item of currentChecklist) {
            if (toCheck.includes(item.text.toLowerCase())) {
              item.done = true;
            }
          }
          changes.checklist = { from: "modified", to: `checked ${toCheck.length} items` };
        }
        if (options.uncheck) {
          const toUncheck = parseCommaSeparated(options.uncheck).map((s) => s.toLowerCase());
          for (const item of currentChecklist) {
            if (toUncheck.includes(item.text.toLowerCase())) {
              item.done = false;
            }
          }
          changes.checklist = { from: "modified", to: `unchecked ${toUncheck.length} items` };
        }
        fm.checklist = currentChecklist;

        // ── Content ──
        let content = parsed.content;
        if (options.content !== undefined) {
          content = options.content;
          changes.content = { from: "(previous)", to: "(updated)" };
        }

        // ── Update timestamp ──
        fm.updatedAt = new Date().toISOString();

        if (options.dryRun) {
          printSuccess({
            dryRun: true,
            id: rawIssue.id,
            changes,
            frontmatter: fm,
          }, warnings);
          return;
        }

        // ── Write file ──
        const markdown = buildMarkdown(fm, content);

        // Determine if we need to move the folder (status or title change)
        const newStatusFolder = options.status !== undefined
          ? getStatusFolderName(config, fm.status as string) ?? null
          : null;
        const newTitle = options.title !== undefined ? options.title : null;

        if (newStatusFolder !== null || newTitle !== null) {
          const moveResult = await moveIssueFolder(
            projectPath,
            rawIssue.filePath,
            newStatusFolder,
            newTitle,
            rawIssue.id,
          );

          if (moveResult.moved) {
            // Write to the new path
            const newAbsPath = findIssueAbsolutePath(projectPath, moveResult.newRelativePath);
            await writeText(newAbsPath, markdown);

            verboseLog(`Moved issue to ${moveResult.newRelativePath}`);

            printSuccess({
              id: rawIssue.id,
              changes,
              moved: true,
              oldPath: moveResult.oldPath,
              newPath: moveResult.newPath,
              filePath: moveResult.newRelativePath,
            }, warnings);
            return;
          }
        }

        // No move needed — write in place
        await writeText(absolutePath, markdown);
        verboseLog(`Updated issue at ${absolutePath}`);

        printSuccess({
          id: rawIssue.id,
          changes,
          filePath: rawIssue.filePath,
        }, warnings);
      } catch (err) {
        printError(err);
        process.exit(err instanceof MdpError ? err.exitCode : 1);
      }
    });
}
