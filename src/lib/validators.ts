import type { StatusConfig, PriorityConfig, LabelConfig, TypeConfig } from "../types.ts";
import { MdpError, invalidStatus, invalidPriority, invalidType, invalidLabel, invalidDate } from "../errors.ts";

export function validateStatus(
  statuses: Record<string, StatusConfig[]>,
  status: string,
): string {
  const all = (Object.values(statuses) as StatusConfig[][]).flat();
  const found = all.find(
    (s) => s.name.toLowerCase() === status.toLowerCase(),
  );
  if (!found) {
    throw invalidStatus(
      status,
      all.map((s) => s.name),
    );
  }
  return found.name;
}

export function validatePriority(priorities: PriorityConfig[], priority: string): string {
  const found = priorities.find(
    (p) => p.name.toLowerCase() === priority.toLowerCase(),
  );
  if (!found) {
    throw invalidPriority(
      priority,
      priorities.map((p) => p.name),
    );
  }
  return found.name;
}

export function validateType(types: TypeConfig[], type: string): string {
  const found = types.find(
    (t) => t.name.toLowerCase() === type.toLowerCase(),
  );
  if (!found) {
    throw invalidType(
      type,
      types.map((t) => t.name),
    );
  }
  return found.name;
}

export function validateLabels(labels: LabelConfig[], inputLabels: string[]): string[] {
  const validated: string[] = [];

  for (const label of inputLabels) {
    const trimmed = label.trim();
    if (!trimmed) continue;

    const found = labels.find(
      (l) => l.name.toLowerCase() === trimmed.toLowerCase(),
    );
    if (!found) {
      throw invalidLabel(trimmed, labels.map((l) => l.name));
    }
    validated.push(found.name);
  }

  return validated;
}

export function validateDate(dateStr: string): string {
  if (dateStr === "none") return "";

  // Accept YYYY-MM-DD format
  const match = dateStr.match(/^\d{4}-\d{2}-\d{2}$/);
  if (!match) {
    throw invalidDate(dateStr);
  }

  const date = new Date(dateStr + "T00:00:00.000Z");
  if (isNaN(date.getTime())) {
    throw invalidDate(dateStr);
  }

  return dateStr;
}

export function parseCommaSeparated(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function validateEstimate(value: string): number | null {
  if (value === "none") return null;
  const n = Number(value);
  if (isNaN(n) || n < 0 || !Number.isInteger(n)) {
    throw new MdpError(
      "INVALID_INPUT",
      `Invalid estimate "${value}". Must be a positive integer or "none".`,
      { value },
    );
  }
  return n;
}

export function validateSpent(value: string): number | null {
  if (value === "none") return null;
  const n = Number(value);
  if (isNaN(n) || n < 0) {
    throw new MdpError(
      "INVALID_INPUT",
      `Invalid spent "${value}". Must be a non-negative number or "none".`,
      { value },
    );
  }
  return n;
}
