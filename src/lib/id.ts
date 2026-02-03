import { join } from "node:path";
import { PROJECT_DIR } from "../constants.ts";
import { listDir, listSubDirs } from "./fs-utils.ts";

export async function getNextId(projectPath: string, prefix: string, entityType: "issues" | "milestones"): Promise<string> {
  const basePath = join(projectPath, PROJECT_DIR, entityType);
  let maxNum = 0;

  // Scan all status directories
  const statusDirs = await listSubDirs(basePath);
  for (const statusDir of statusDirs) {
    const statusPath = join(basePath, statusDir);
    const items = await listDir(statusPath);
    for (const item of items) {
      const match = item.match(new RegExp(`^${prefix}-(\\d+)`));
      if (match) {
        const num = parseInt(match[1]!, 10);
        if (num > maxNum) maxNum = num;
      }
    }
  }

  const nextNum = maxNum + 1;
  const padded = String(nextNum).padStart(3, "0");
  return `${prefix}-${padded}`;
}
