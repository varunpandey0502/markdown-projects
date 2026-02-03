import { join } from "node:path";
import type { Command } from "commander";
import { PROJECT_DIR } from "../../constants.ts";
import { MdpError } from "../../errors.ts";
import { readConfig, getStatusFolderName } from "../../lib/config.ts";
import { resolveProjectPath } from "../../lib/project-finder.ts";
import { getGlobalOptions } from "../../lib/command-utils.ts";
import { getNextId } from "../../lib/id.ts";
import { slugify } from "../../lib/slug.ts";
import { buildMarkdown, parseMarkdown } from "../../lib/frontmatter.ts";
import { ensureDir, writeText, readText, pathExists } from "../../lib/fs-utils.ts";
import { validateStatus, validatePriority, validateType, validateLabels, validateDate, parseCommaSeparated, validateEstimate, validateSpent } from "../../lib/validators.ts";
import { printSuccess, printError, verboseLog } from "../../output.ts";
import type { ChecklistItem, LogEntry } from "../../types.ts";

export function registerIssueCreateCommand(issueCmd: Command): void {
  issueCmd
    .command("create")
    .description("Create a new issue")
    .requiredOption("-t, --title <title>", "Issue title")
    .option("--type <type>", "Issue type (config-driven)")
    .option("-s, --status <status>", "Initial status", "Backlog")
    .option("--priority <priority>", "Priority level", "None")
    .option("-l, --labels <labels>", "Comma-separated labels")
    .option("-a, --assignee <assignee>", "Assignee identifier")
    .option("-m, --milestone <milestone>", "Milestone ID")
    .option("-e, --estimate <estimate>", "Effort points (positive integer)")
    .option("--spent <spent>", "Actual effort spent")
    .option("--due-date <date>", "Due date (YYYY-MM-DD)")
    .option("--blocked-by <ids>", "Comma-separated issue IDs")
    .option("--parent <id>", "Parent issue ID")
    .option("--related-to <ids>", "Comma-separated issue IDs")
    .option("--checklist <items>", "Comma-separated checklist items")
    .option("-d, --description <desc>", "Short description")
    .option("-c, --content <content>", "Full markdown body (or - for stdin)")
    .option("--template <name>", "Template name from .mdp/templates/")
    .option("--dry-run", "Preview without creating", false)
    .action(async (options, cmd) => {
      try {
        const globals = getGlobalOptions(cmd);
        const projectPath = await resolveProjectPath(globals.projectPath);
        const config = await readConfig(projectPath);
        const warnings: string[] = [];

        verboseLog(`Creating issue in ${projectPath}`);

        // Validate fields
        const status = validateStatus(config.issues.statuses, options.status);
        const priority = validatePriority(config.issues.priorities, options.priority);

        // Type defaults to first type in config
        const defaultType = config.issues.types[0]?.name ?? "task";
        const type = validateType(config.issues.types, options.type ?? defaultType);

        const labelsRaw = parseCommaSeparated(options.labels);
        const { validated: labels, warnings: labelWarnings } = validateLabels(config.issues.labels, labelsRaw);
        warnings.push(...labelWarnings);

        const estimate = options.estimate ? validateEstimate(options.estimate) : null;
        const spent = options.spent ? validateSpent(options.spent) : null;
        const dueDate = options.dueDate ? validateDate(options.dueDate) : null;

        const blockedBy = parseCommaSeparated(options.blockedBy);
        const relatedTo = parseCommaSeparated(options.relatedTo);

        const checklistItems = parseCommaSeparated(options.checklist);
        const checklist: ChecklistItem[] = checklistItems.map((text) => ({ text, done: false }));

        const assignee = options.assignee ?? null;
        const milestone = options.milestone ?? null;
        const parent = options.parent ?? null;

        // Handle template
        let templateContent = "";
        let templateFrontmatter: Record<string, unknown> = {};
        if (options.template) {
          const templatePath = join(projectPath, PROJECT_DIR, "templates", `${options.template}.md`);
          if (!(await pathExists(templatePath))) {
            throw new MdpError("TEMPLATE_NOT_FOUND", `Template "${options.template}" not found`, { name: options.template });
          }
          const templateRaw = await readText(templatePath);
          const parsed = parseMarkdown(templateRaw);
          templateFrontmatter = parsed.frontmatter;
          templateContent = parsed.content;
        }

        // Handle content
        let content = "";
        if (options.content === "-") {
          content = await readStdin();
        } else if (options.content) {
          content = options.content;
        } else if (options.description) {
          content = `## Description\n\n${options.description}\n`;
        } else if (templateContent) {
          content = templateContent;
        }

        // Generate ID
        const id = options.dryRun ? `${config.issues.prefix}-XXX` : await getNextId(projectPath, config.issues.prefix, "issues");
        const slug = slugify(options.title);
        const folderName = `${id}-${slug}`;

        const statusFolder = getStatusFolderName(config, status);
        if (!statusFolder) {
          throw new MdpError("INVALID_STATUS", `No folder mapping for status "${status}"`, { status });
        }

        const now = new Date().toISOString();

        // Build frontmatter (template values as defaults, CLI flags override)
        const frontmatter: Record<string, unknown> = {
          id,
          title: options.title,
          type: type || (templateFrontmatter.type as string) || defaultType,
          status,
          priority: priority || (templateFrontmatter.priority as string) || "None",
          labels: labels.length > 0 ? labels : (templateFrontmatter.labels as string[]) || [],
          assignee: assignee ?? (templateFrontmatter.assignee as string | null) ?? null,
          milestone: milestone ?? (templateFrontmatter.milestone as string | null) ?? null,
          estimate: estimate ?? (templateFrontmatter.estimate as number | null) ?? null,
          spent: spent ?? (templateFrontmatter.spent as number | null) ?? null,
          dueDate: dueDate || (templateFrontmatter.dueDate as string | null) || null,
          blockedBy: blockedBy.length > 0 ? blockedBy : (templateFrontmatter.blockedBy as string[]) || [],
          parent: parent ?? (templateFrontmatter.parent as string | null) ?? null,
          relatedTo: relatedTo.length > 0 ? relatedTo : (templateFrontmatter.relatedTo as string[]) || [],
          checklist: checklist.length > 0 ? checklist : (templateFrontmatter.checklist as ChecklistItem[]) || [],
          log: (templateFrontmatter.log as LogEntry[]) || [],
          createdAt: now,
          updatedAt: now,
        };

        const filePath = `${PROJECT_DIR}/issues/${statusFolder}/${folderName}/${folderName}.md`;

        if (options.dryRun) {
          printSuccess({
            dryRun: true,
            ...frontmatter,
            filePath,
            content,
          }, warnings);
          return;
        }

        // Write to disk
        const fullDirPath = join(projectPath, PROJECT_DIR, "issues", statusFolder, folderName);
        await ensureDir(fullDirPath);

        const markdown = buildMarkdown(frontmatter, content);
        const fullFilePath = join(fullDirPath, `${folderName}.md`);
        await writeText(fullFilePath, markdown);

        verboseLog(`Created issue at ${fullFilePath}`);

        printSuccess({
          ...frontmatter,
          filePath,
        }, warnings);
      } catch (err) {
        printError(err);
        process.exit(err instanceof MdpError ? err.exitCode : 1);
      }
    });
}

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  const reader = process.stdin;

  return new Promise((resolve, reject) => {
    reader.on("data", (chunk: Buffer) => chunks.push(chunk));
    reader.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")));
    reader.on("error", reject);

    if (process.stdin.isTTY) {
      resolve("");
    }
  });
}
