import { resolve } from "node:path";
import type { Command } from "commander";
import { readGlobalConfig, writeGlobalConfig, ensureTagsExist } from "../../lib/settings.ts";
import { printSuccess, printError } from "../../output.ts";
import { MdpError } from "../../errors.ts";

export function registerProjectTagCommand(parent: Command): void {
  parent
    .command("tag")
    .description("Add or remove tags from a registered project")
    .argument("<path>", "Path to the project")
    .option("--add <tags>", "Comma-separated tags to add")
    .option("--remove <tags>", "Comma-separated tags to remove")
    .action(async (projectPath: string, options) => {
      try {
        if (!options.add && !options.remove) {
          throw new MdpError(
            "INVALID_INPUT",
            "Specify --add or --remove with comma-separated tags",
            {},
          );
        }

        const absPath = resolve(projectPath);
        const settings = (await readGlobalConfig()) ?? {};
        const projects = settings.projects ?? [];

        const project = projects.find((p) => p.path === absPath);
        if (!project) {
          throw new MdpError(
            "NOT_FOUND",
            `Project not registered: ${absPath}`,
            { path: absPath },
          );
        }

        if (options.add) {
          const toAdd = options.add.split(",").map((t: string) => t.trim()).filter(Boolean);
          ensureTagsExist(settings, toAdd);
          for (const tag of toAdd) {
            if (!project.tags.includes(tag)) {
              project.tags.push(tag);
            }
          }
        }

        if (options.remove) {
          const toRemove = options.remove.split(",").map((t: string) => t.trim()).filter(Boolean);
          project.tags = project.tags.filter((t) => !toRemove.includes(t));
        }

        await writeGlobalConfig(settings);

        printSuccess({
          project: { path: project.path, tags: project.tags },
        });
      } catch (err) {
        printError(err);
        process.exit(err instanceof MdpError ? err.exitCode : 1);
      }
    });
}
