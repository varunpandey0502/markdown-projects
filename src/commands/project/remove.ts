import { resolve } from "node:path";
import type { Command } from "commander";
import { readGlobalConfig, writeGlobalConfig } from "../../lib/settings.ts";
import { printSuccess, printError } from "../../output.ts";
import { MdpError } from "../../errors.ts";

export function registerProjectRemoveCommand(parent: Command): void {
  parent
    .command("remove")
    .description("Remove a registered project path")
    .argument("<path>", "Path to the project")
    .action(async (projectPath: string) => {
      try {
        const absPath = resolve(projectPath);
        const settings = (await readGlobalConfig()) ?? {};
        const projects = settings.projects ?? [];

        const index = projects.findIndex((p) => p.path === absPath);
        if (index === -1) {
          throw new MdpError(
            "NOT_FOUND",
            `Project not registered: ${absPath}`,
            { path: absPath },
          );
        }

        const removed = projects.splice(index, 1)[0]!;
        settings.projects = projects;

        await writeGlobalConfig(settings);

        printSuccess({
          removed: { path: removed.path, tags: removed.tags },
        });
      } catch (err) {
        printError(err);
        process.exit(err instanceof MdpError ? err.exitCode : 1);
      }
    });
}
