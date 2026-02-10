import type { Command } from "commander";
import { MdpError, invalidInput } from "../errors.ts";
import { readConfig } from "../lib/config.ts";
import { readProjectMd } from "../lib/settings.ts";
import { resolveProjectPath } from "../lib/project-finder.ts";
import { getGlobalOptions } from "../lib/command-utils.ts";
import { readAllIssues } from "../lib/issue-reader.ts";
import type { RawIssue } from "../lib/issue-reader.ts";
import { readAllMilestones } from "../lib/milestone-reader.ts";
import type { RawMilestone } from "../lib/milestone-reader.ts";
import { parseCommaSeparated } from "../lib/validators.ts";
import { printSuccess, printError, printTable, getFormat, verboseLog } from "../output.ts";
import { formatTable, SEARCH_TABLE_COLUMNS } from "../lib/table.ts";
import { search } from "../lib/bm25.ts";
import type { SearchDocument, SearchableField, SearchResult } from "../lib/bm25.ts";
import type { ProjectData } from "../types.ts";

const VALID_ENTITIES = ["issues", "milestones", "project", "all"] as const;
const VALID_FIELDS: SearchableField[] = ["title", "content", "log", "checklist"];

function filterByStatus<T extends { status: string }>(items: T[], statuses: string[]): T[] {
  if (statuses.length === 0) return items;
  const lower = statuses.map((s) => s.toLowerCase());
  return items.filter((item) => lower.includes(item.status.toLowerCase()));
}

function buildSearchDocuments(
  issues: RawIssue[],
  milestones: RawMilestone[],
  projectData: ProjectData | null,
  entityFilter: string,
  fieldFilter: SearchableField[],
): SearchDocument[] {
  const docs: SearchDocument[] = [];

  if (entityFilter === "all" || entityFilter === "project") {
    if (projectData) {
      const fields = buildFieldsForProject(projectData, fieldFilter);
      if (fields.length > 0) {
        docs.push({
          id: "project",
          entity: "project",
          title: projectData.title,
          status: projectData.health ?? "",
          fields,
        });
      }
    }
  }

  if (entityFilter === "all" || entityFilter === "issues") {
    for (const issue of issues) {
      const fields = buildFieldsForIssue(issue, fieldFilter);
      if (fields.length > 0) {
        docs.push({
          id: issue.id,
          entity: "issue",
          title: issue.title,
          status: issue.status,
          fields,
        });
      }
    }
  }

  if (entityFilter === "all" || entityFilter === "milestones") {
    for (const ms of milestones) {
      const fields = buildFieldsForMilestone(ms, fieldFilter);
      if (fields.length > 0) {
        docs.push({
          id: ms.id,
          entity: "milestone",
          title: ms.title,
          status: ms.status,
          fields,
        });
      }
    }
  }

  return docs;
}

function buildFieldsForIssue(issue: RawIssue, fieldFilter: SearchableField[]) {
  const fields: { name: SearchableField; text: string }[] = [];

  if (fieldFilter.includes("title") && issue.title) {
    fields.push({ name: "title", text: issue.title });
  }
  if (fieldFilter.includes("content") && issue.content) {
    fields.push({ name: "content", text: issue.content });
  }
  if (fieldFilter.includes("log") && issue.log && issue.log.length > 0) {
    const logText = issue.log.map((entry) => entry.body).join(" ");
    fields.push({ name: "log", text: logText });
  }
  if (fieldFilter.includes("checklist") && issue.checklist && issue.checklist.length > 0) {
    const checklistText = issue.checklist.map((item) => item.text).join(" ");
    fields.push({ name: "checklist", text: checklistText });
  }

  return fields;
}

function buildFieldsForMilestone(ms: RawMilestone, fieldFilter: SearchableField[]) {
  const fields: { name: SearchableField; text: string }[] = [];

  if (fieldFilter.includes("title") && ms.title) {
    fields.push({ name: "title", text: ms.title });
  }
  if (fieldFilter.includes("content") && ms.content) {
    fields.push({ name: "content", text: ms.content });
  }
  if (fieldFilter.includes("log") && ms.log && ms.log.length > 0) {
    const logText = ms.log.map((entry) => entry.body).join(" ");
    fields.push({ name: "log", text: logText });
  }
  if (fieldFilter.includes("checklist") && ms.checklist && ms.checklist.length > 0) {
    const checklistText = ms.checklist.map((item) => item.text).join(" ");
    fields.push({ name: "checklist", text: checklistText });
  }

  return fields;
}

function buildFieldsForProject(project: ProjectData, fieldFilter: SearchableField[]) {
  const fields: { name: SearchableField; text: string }[] = [];

  if (fieldFilter.includes("title") && project.title) {
    let titleText = project.title;
    if (project.description) titleText += " " + project.description;
    if (project.instructions) titleText += " " + project.instructions;
    fields.push({ name: "title", text: titleText });
  }
  if (fieldFilter.includes("content") && project.content) {
    fields.push({ name: "content", text: project.content });
  }
  if (fieldFilter.includes("log") && project.log && project.log.length > 0) {
    const logText = project.log.map((entry) => entry.body).join(" ");
    fields.push({ name: "log", text: logText });
  }

  return fields;
}

function formatResultsForTable(results: SearchResult[]): Record<string, unknown>[] {
  return results.map((r) => ({
    entity: r.entity,
    id: r.id,
    title: r.title,
    status: r.status,
    score: r.score,
    matchedFields: r.matches.map((m) => m.field).join(", "),
  }));
}

export function registerSearchCommand(program: Command): void {
  program
    .command("search")
    .description("Search project, issues, and milestones by text content")
    .requiredOption("--query <text>", "Search query text")
    .option("--entity <type>", "Entity type: issues, milestones, project, all", "all")
    .option("--fields <fields>", "Comma-separated fields to search: title, content, log, checklist")
    .option("-s, --status <statuses>", "Pre-filter by comma-separated statuses")
    .option("--limit <n>", "Maximum number of results", "20")
    .action(async (options, cmd) => {
      try {
        const globals = getGlobalOptions(cmd);
        const projectPath = await resolveProjectPath(globals.projectPath);
        const config = await readConfig(projectPath);

        const query: string = options.query;
        if (!query.trim()) {
          throw invalidInput("Query cannot be empty", { query });
        }

        // Validate entity filter
        const entityFilter: string = options.entity;
        if (!VALID_ENTITIES.includes(entityFilter as typeof VALID_ENTITIES[number])) {
          throw invalidInput(
            `Invalid entity type "${entityFilter}". Valid values: ${VALID_ENTITIES.join(", ")}`,
            { entity: entityFilter },
          );
        }

        // Parse and validate field filter
        let fieldFilter: SearchableField[] = [...VALID_FIELDS];
        if (options.fields) {
          const parsed = parseCommaSeparated(options.fields);
          for (const f of parsed) {
            if (!VALID_FIELDS.includes(f as SearchableField)) {
              throw invalidInput(
                `Invalid search field "${f}". Valid fields: ${VALID_FIELDS.join(", ")}`,
                { field: f },
              );
            }
          }
          fieldFilter = parsed as SearchableField[];
        }

        // Parse status filter
        const statusFilter = options.status ? parseCommaSeparated(options.status) : [];

        // Parse limit
        const limit = parseInt(options.limit, 10);
        if (isNaN(limit) || limit < 1) {
          throw invalidInput("Limit must be a positive integer", { limit: options.limit });
        }

        verboseLog(`Searching for "${query}" in ${entityFilter} (fields: ${fieldFilter.join(", ")})`);

        // Read entities
        let issues: RawIssue[] = [];
        let milestones: RawMilestone[] = [];
        let projectData: ProjectData | null = null;

        if (entityFilter === "all" || entityFilter === "project") {
          try {
            projectData = await readProjectMd(projectPath);
            verboseLog("Loaded project data");
          } catch {
            verboseLog("No project.md found, skipping project search");
          }
        }

        if (entityFilter === "all" || entityFilter === "issues") {
          issues = await readAllIssues(projectPath, config);
          if (statusFilter.length > 0) {
            issues = filterByStatus(issues, statusFilter);
          }
          verboseLog(`Loaded ${issues.length} issues`);
        }

        if (entityFilter === "all" || entityFilter === "milestones") {
          milestones = await readAllMilestones(projectPath, config);
          if (statusFilter.length > 0) {
            milestones = filterByStatus(milestones, statusFilter);
          }
          verboseLog(`Loaded ${milestones.length} milestones`);
        }

        // Build search corpus and run search
        const documents = buildSearchDocuments(issues, milestones, projectData, entityFilter, fieldFilter);
        verboseLog(`Built ${documents.length} search documents`);

        const results = search(documents, query, limit);
        verboseLog(`Found ${results.length} results`);

        if (getFormat() === "table") {
          const tableRows = formatResultsForTable(results);
          printTable(formatTable(tableRows, SEARCH_TABLE_COLUMNS));
          printTable(`\nQuery: "${query}" — ${results.length} result(s)`);
        } else {
          printSuccess({
            query,
            total: results.length,
            results,
          });
        }
      } catch (err) {
        printError(err);
        process.exit(err instanceof MdpError ? err.exitCode : 1);
      }
    });
}
