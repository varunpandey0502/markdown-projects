import { join, dirname, resolve } from "node:path";
import { PROJECT_DIR } from "../constants.ts";
import { isDirectory } from "./fs-utils.ts";
import { MdpError } from "../errors.ts";

export async function resolveProjectPath(explicitPath?: string): Promise<string> {
  if (!explicitPath) {
    throw new MdpError(
      "PROJECT_NOT_FOUND",
      `No project path specified. Use -p <path> to specify the project root.`,
      {},
      2,
    );
  }

  const resolved = resolve(explicitPath);
  if (await isDirectory(join(resolved, PROJECT_DIR))) {
    return resolved;
  }
  // Maybe they pointed at the .mdp dir itself
  if (resolved.endsWith(PROJECT_DIR) && await isDirectory(resolved)) {
    return dirname(resolved);
  }

  throw new MdpError(
    "PROJECT_NOT_FOUND",
    `No ${PROJECT_DIR}/ directory found at ${resolved}`,
    { projectPath: resolved },
    2,
  );
}
