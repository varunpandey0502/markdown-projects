import type { Command } from "commander";
import { readRegisteredProjects } from "../../lib/settings.ts";
import { printSuccess, printError } from "../../output.ts";
import { MdpError } from "../../errors.ts";

export function registerProjectListCommand(parent: Command): void {
  parent
    .command("list")
    .description("List all registered projects")
    .option("--tag <tag>", "Filter projects by tag")
    .action(async (options) => {
      try {
        let projects = await readRegisteredProjects();

        if (options.tag) {
          projects = projects.filter((p) => p.tags.includes(options.tag));
        }

        printSuccess({
          projects,
          total: projects.length,
        });
      } catch (err) {
        printError(err);
        process.exit(err instanceof MdpError ? err.exitCode : 1);
      }
    });
}
