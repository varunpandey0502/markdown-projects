import { join } from "node:path";
import { PROJECT_DIR } from "../constants.ts";
import { listDir } from "./fs-utils.ts";

export function parseIdNumber(id: string): number {
  const match = id.match(/-(\d+)$/);
  if (!match) {
    throw new Error(`Cannot parse numeric part from ID "${id}"`);
  }
  return parseInt(match[1]!, 10);
}

export function formatId(prefix: string, num: number): string {
  return `${prefix}-${num}`;
}

export async function getNextId(projectPath: string, prefix: string, entityType: "issues" | "milestones"): Promise<string> {
  const basePath = join(projectPath, PROJECT_DIR, entityType);
  let maxNum = 0;

  const items = await listDir(basePath);
  for (const item of items) {
    const match = item.match(new RegExp(`^${prefix}-(\\d+)`));
    if (match) {
      const num = parseInt(match[1]!, 10);
      if (num > maxNum) maxNum = num;
    }
  }

  const nextNum = maxNum + 1;
  return `${prefix}-${nextNum}`;
}
