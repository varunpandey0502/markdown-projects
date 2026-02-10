import { join, resolve } from "node:path";
import type { Command } from "commander";
import { PROJECT_DIR } from "../../constants.ts";
import { pathExists } from "../../lib/fs-utils.ts";
import { readGlobalConfig, writeGlobalConfig, ensureTagsExist } from "../../lib/settings.ts";
import { printSuccess, printError } from "../../output.ts";
import { MdpError } from "../../errors.ts";

export function registerProjectAddCommand(parent: Command): void {
  parent
    .command("add")
    .description("Register an existing project")
    .argument("<path>", "Path to the project")
    .option("--tags <tags>", "Comma-separated tags for grouping")
    .action(async (projectPath: string, options) => {
      try {
        const absPath = resolve(projectPath);

        // Verify .mdp/ exists
        const mdpPath = join(absPath, PROJECT_DIR);
        if (!(await pathExists(mdpPath))) {
          throw new MdpError(
            "PROJECT_NOT_FOUND",
            `No .mdp/ directory found at ${absPath}. Use "mdp project create -p ${absPath}" to create one.`,
            { path: absPath },
            2,
          );
        }

        const tags = options.tags
          ? options.tags.split(",").map((t: string) => t.trim()).filter(Boolean)
          : [];

        const settings = (await readGlobalConfig()) ?? {};
        const projects = settings.projects ?? [];

        // Check for duplicates
        const existing = projects.find((p) => p.path === absPath);
        if (existing) {
          throw new MdpError(
            "ALREADY_EXISTS",
            `Project already registered: ${absPath}`,
            { path: absPath },
          );
        }

        ensureTagsExist(settings, tags);
        projects.push({ path: absPath, tags });
        settings.projects = projects;

        await writeGlobalConfig(settings);

        printSuccess({
          added: { path: absPath, tags },
        });
      } catch (err) {
        printError(err);
        process.exit(err instanceof MdpError ? err.exitCode : 1);
      }
    });
}
