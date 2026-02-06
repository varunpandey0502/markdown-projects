import { logEntryNotFound, missingRequired } from "../errors.ts";
import { buildMarkdown, parseMarkdown } from "./frontmatter.ts";
import { readText, writeText } from "./fs-utils.ts";
import type { LogEntry } from "../types.ts";

export interface LogEntityContext {
  id: string;
  filePath: string;
  absolutePath: string;
}

function readLog(fm: Record<string, unknown>): LogEntry[] {
  return Array.isArray(fm.log) ? (fm.log as LogEntry[]) : [];
}

export async function addLogEntry(
  ctx: LogEntityContext,
  author: string,
  body: string,
  dryRun: boolean,
): Promise<{ entry: LogEntry; totalEntries: number }> {
  if (!body) throw missingRequired("body");

  const now = new Date().toISOString();
  const newEntry: LogEntry = { timestamp: now, author, body };

  const rawContent = await readText(ctx.absolutePath);
  const parsed = parseMarkdown(rawContent);
  const fm = { ...parsed.frontmatter };

  const currentLog = [...readLog(fm), newEntry];
  fm.log = currentLog;
  fm.updatedAt = now;

  if (!dryRun) {
    const markdown = buildMarkdown(fm, parsed.content);
    await writeText(ctx.absolutePath, markdown);
  }

  return { entry: newEntry, totalEntries: currentLog.length };
}

export async function listLogEntries(
  ctx: LogEntityContext,
): Promise<{ entries: LogEntry[]; totalEntries: number }> {
  const rawContent = await readText(ctx.absolutePath);
  const parsed = parseMarkdown(rawContent);
  const entries = readLog(parsed.frontmatter);
  return { entries, totalEntries: entries.length };
}

export async function getLogEntry(
  ctx: LogEntityContext,
  index: number,
): Promise<{ index: number; entry: LogEntry }> {
  const rawContent = await readText(ctx.absolutePath);
  const parsed = parseMarkdown(rawContent);
  const entries = readLog(parsed.frontmatter);

  if (index < 0 || index >= entries.length) {
    throw logEntryNotFound(index, ctx.id);
  }

  return { index, entry: entries[index]! };
}

export async function updateLogEntry(
  ctx: LogEntityContext,
  index: number,
  updates: { author?: string; body?: string },
  dryRun: boolean,
): Promise<{ index: number; entry: LogEntry; changes: string[] }> {
  const rawContent = await readText(ctx.absolutePath);
  const parsed = parseMarkdown(rawContent);
  const fm = { ...parsed.frontmatter };
  const entries = [...readLog(fm)];

  if (index < 0 || index >= entries.length) {
    throw logEntryNotFound(index, ctx.id);
  }

  const changes: string[] = [];
  const entry = { ...entries[index]! };

  if (updates.author !== undefined) {
    changes.push("author");
    entry.author = updates.author;
  }
  if (updates.body !== undefined) {
    changes.push("body");
    entry.body = updates.body;
  }

  entries[index] = entry;

  const now = new Date().toISOString();
  fm.log = entries;
  fm.updatedAt = now;

  if (!dryRun) {
    const markdown = buildMarkdown(fm, parsed.content);
    await writeText(ctx.absolutePath, markdown);
  }

  return { index, entry, changes };
}

export async function deleteLogEntry(
  ctx: LogEntityContext,
  index: number,
  dryRun: boolean,
): Promise<{ index: number; deletedEntry: LogEntry; remainingEntries: number }> {
  const rawContent = await readText(ctx.absolutePath);
  const parsed = parseMarkdown(rawContent);
  const fm = { ...parsed.frontmatter };
  const entries = [...readLog(fm)];

  if (index < 0 || index >= entries.length) {
    throw logEntryNotFound(index, ctx.id);
  }

  const deletedEntry = entries[index]!;
  entries.splice(index, 1);

  const now = new Date().toISOString();
  fm.log = entries;
  fm.updatedAt = now;

  if (!dryRun) {
    const markdown = buildMarkdown(fm, parsed.content);
    await writeText(ctx.absolutePath, markdown);
  }

  return { index, deletedEntry, remainingEntries: entries.length };
}
