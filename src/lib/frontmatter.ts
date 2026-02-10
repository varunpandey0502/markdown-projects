import { stringify, parse } from "yaml";

export interface ParsedMarkdown {
  frontmatter: Record<string, unknown>;
  content: string;
}

export function parseMarkdown(raw: string): ParsedMarkdown {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) {
    return { frontmatter: {}, content: raw };
  }

  const yamlStr = match[1]!;
  const content = (match[2] ?? "").replace(/^\n/, "");
  const frontmatter = (parse(yamlStr) as Record<string, unknown>) ?? {};

  return { frontmatter, content };
}

export function buildMarkdown(frontmatter: Record<string, unknown>, content: string): string {
  const yamlStr = stringify(frontmatter, {
    indent: 2,
    lineWidth: 0,
    defaultKeyType: "PLAIN",
    defaultStringType: "PLAIN",
    nullStr: "null",
    falseStr: "false",
    trueStr: "true",
  }).trimEnd();

  const body = content ? `\n${content}` : "";
  return `---\n${yamlStr}\n---\n${body}`;
}

// ── Safe field extraction helpers ──

export function getString(obj: Record<string, unknown>, key: string): string | null {
  const val = obj[key];
  if (typeof val === "string") return val;
  if (val === null || val === undefined) return null;
  return String(val);
}

export function getNumber(obj: Record<string, unknown>, key: string): number | null {
  const val = obj[key];
  if (typeof val === "number") return val;
  if (typeof val === "string") {
    const n = Number(val);
    if (!Number.isNaN(n)) return n;
  }
  return null;
}

export function getBoolean(obj: Record<string, unknown>, key: string, defaultVal: boolean = false): boolean {
  const val = obj[key];
  if (typeof val === "boolean") return val;
  if (val === "true") return true;
  if (val === "false") return false;
  return defaultVal;
}

export function getStringArray(obj: Record<string, unknown>, key: string): string[] {
  const val = obj[key];
  if (Array.isArray(val)) return val.map(String);
  return [];
}

export interface RawChecklistItem {
  text: string;
  done: boolean;
}

export function getChecklist(obj: Record<string, unknown>, key: string): RawChecklistItem[] {
  const val = obj[key];
  if (!Array.isArray(val)) return [];
  return val
    .filter((item): item is Record<string, unknown> => item !== null && typeof item === "object")
    .map((item) => ({
      text: String(item.text ?? ""),
      done: item.done === true,
    }));
}

export interface RawLogEntry {
  timestamp: string;
  author: string;
  body: string;
}

export function getLogEntries(obj: Record<string, unknown>, key: string): RawLogEntry[] {
  const val = obj[key];
  if (!Array.isArray(val)) return [];
  return val
    .filter((item): item is Record<string, unknown> => item !== null && typeof item === "object")
    .map((item) => ({
      timestamp: String(item.timestamp ?? ""),
      author: String(item.author ?? ""),
      body: String(item.body ?? ""),
    }));
}

export interface RawProjectLogEntry extends RawLogEntry {
  health?: string;
}

export function getProjectLogEntries(obj: Record<string, unknown>, key: string): RawProjectLogEntry[] {
  const val = obj[key];
  if (!Array.isArray(val)) return [];
  return val
    .filter((item): item is Record<string, unknown> => item !== null && typeof item === "object")
    .map((item) => {
      const entry: RawProjectLogEntry = {
        timestamp: String(item.timestamp ?? ""),
        author: String(item.author ?? ""),
        body: String(item.body ?? ""),
      };
      if (typeof item.health === "string") {
        entry.health = item.health;
      }
      return entry;
    });
}
