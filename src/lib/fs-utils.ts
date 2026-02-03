import { mkdir, readdir, readFile, writeFile, rm, rename, stat } from "node:fs/promises";
import { join } from "node:path";

export async function pathExists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

export async function isDirectory(path: string): Promise<boolean> {
  try {
    const s = await stat(path);
    return s.isDirectory();
  } catch {
    return false;
  }
}

export async function ensureDir(path: string): Promise<void> {
  await mkdir(path, { recursive: true });
}

export async function readText(path: string): Promise<string> {
  return readFile(path, "utf-8");
}

export async function writeText(path: string, content: string): Promise<void> {
  await writeFile(path, content, "utf-8");
}

export async function removeDir(path: string): Promise<void> {
  await rm(path, { recursive: true, force: true });
}

export async function renameEntry(oldPath: string, newPath: string): Promise<void> {
  await rename(oldPath, newPath);
}

export async function listDir(path: string): Promise<string[]> {
  try {
    return await readdir(path);
  } catch {
    return [];
  }
}

export async function listSubDirs(path: string): Promise<string[]> {
  const entries = await listDir(path);
  const dirs: string[] = [];
  for (const entry of entries) {
    if (await isDirectory(join(path, entry))) {
      dirs.push(entry);
    }
  }
  return dirs;
}
