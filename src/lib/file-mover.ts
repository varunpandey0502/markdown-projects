import { join, dirname, basename } from "node:path";
import { PROJECT_DIR } from "../constants.ts";
import { ensureDir, renameEntry, pathExists } from "./fs-utils.ts";
import { slugify } from "./slug.ts";

export interface MoveResult {
  moved: boolean;
  oldPath: string;
  newPath: string;
  newRelativePath: string;
}

export async function moveIssueFolder(
  projectPath: string,
  currentRelativePath: string,
  newStatusFolder: string | null,
  newTitle: string | null,
  issueId: string,
): Promise<MoveResult> {
  // Current absolute path of the issue folder
  const currentMdPath = join(projectPath, currentRelativePath);
  const currentFolderPath = dirname(currentMdPath);
  const currentStatusDir = dirname(currentFolderPath);
  const currentFolderName = basename(currentFolderPath);

  // Determine new folder name
  let newFolderName = currentFolderName;
  if (newTitle !== null) {
    const newSlug = slugify(newTitle);
    newFolderName = `${issueId}-${newSlug}`;
  }

  // Determine new status directory
  let targetStatusDir = currentStatusDir;
  if (newStatusFolder !== null) {
    // Go up from current status dir to issues/ or milestones/ dir
    const entityTypeDir = dirname(currentStatusDir);
    targetStatusDir = join(entityTypeDir, newStatusFolder);
    await ensureDir(targetStatusDir);
  }

  const newFolderPath = join(targetStatusDir, newFolderName);
  const newMdFileName = `${newFolderName}.md`;
  const newMdPath = join(newFolderPath, newMdFileName);

  // Calculate new relative path
  const entityType = basename(dirname(currentStatusDir)); // "issues" or "milestones"
  const newStatusFolderName = basename(targetStatusDir);
  const newRelativePath = `${PROJECT_DIR}/${entityType}/${newStatusFolderName}/${newFolderName}/${newFolderName}.md`;

  const moved = currentFolderPath !== newFolderPath;

  if (moved) {
    // Rename/move the folder
    await renameEntry(currentFolderPath, newFolderPath);

    // If the md file inside still has the old name, rename it too
    const oldMdName = `${currentFolderName}.md`;
    if (oldMdName !== newMdFileName) {
      const oldMdInsideNewFolder = join(newFolderPath, oldMdName);
      if (await pathExists(oldMdInsideNewFolder)) {
        await renameEntry(oldMdInsideNewFolder, newMdPath);
      }
    }
  }

  return {
    moved,
    oldPath: currentRelativePath,
    newPath: newRelativePath,
    newRelativePath,
  };
}
