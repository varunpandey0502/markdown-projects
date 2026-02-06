/**
 * Simple table formatter for CLI output.
 * Outputs aligned columns with headers.
 */

export interface TableColumn {
  key: string;
  header: string;
  width?: number;
  align?: "left" | "right";
}

export function formatTable(rows: Record<string, unknown>[], columns: TableColumn[]): string {
  if (rows.length === 0) {
    return "(no results)";
  }

  // Calculate column widths
  const widths = columns.map((col) => {
    const maxData = rows.reduce((max, row) => {
      const val = String(row[col.key] ?? "");
      return Math.max(max, val.length);
    }, 0);
    return col.width ?? Math.max(col.header.length, maxData);
  });

  // Header
  const headerLine = columns.map((col, i) => pad(col.header, widths[i]!, col.align ?? "left")).join("  ");
  const separator = widths.map((w) => "─".repeat(w)).join("──");

  // Rows
  const dataLines = rows.map((row) =>
    columns.map((col, i) => {
      const val = String(row[col.key] ?? "");
      return pad(val, widths[i]!, col.align ?? "left");
    }).join("  "),
  );

  return [headerLine, separator, ...dataLines].join("\n");
}

function pad(str: string, width: number, align: "left" | "right"): string {
  if (str.length >= width) return str.slice(0, width);
  const padding = " ".repeat(width - str.length);
  return align === "right" ? padding + str : str + padding;
}

// ── Pre-built table configs for common outputs ──

export const ISSUE_TABLE_COLUMNS: TableColumn[] = [
  { key: "id", header: "ID", width: 8 },
  { key: "title", header: "TITLE", width: 40 },
  { key: "status", header: "STATUS", width: 12 },
  { key: "priority", header: "PRIORITY", width: 8 },
  { key: "type", header: "TYPE", width: 10 },
  { key: "assignee", header: "ASSIGNEE", width: 12 },
];

export const MILESTONE_TABLE_COLUMNS: TableColumn[] = [
  { key: "id", header: "ID", width: 6 },
  { key: "title", header: "TITLE", width: 35 },
  { key: "status", header: "STATUS", width: 12 },
  { key: "completionPercentage", header: "DONE%", width: 6, align: "right" },
  { key: "totalIssues", header: "ISSUES", width: 6, align: "right" },
  { key: "dueDate", header: "DUE", width: 10 },
];

export const STATS_SECTION_COLUMNS: TableColumn[] = [
  { key: "name", header: "NAME", width: 20 },
  { key: "count", header: "COUNT", width: 8, align: "right" },
];

export const SEARCH_TABLE_COLUMNS: TableColumn[] = [
  { key: "entity", header: "TYPE", width: 10 },
  { key: "id", header: "ID", width: 8 },
  { key: "title", header: "TITLE", width: 35 },
  { key: "status", header: "STATUS", width: 12 },
  { key: "score", header: "SCORE", width: 6, align: "right" },
  { key: "matchedFields", header: "MATCHED IN", width: 20 },
];
