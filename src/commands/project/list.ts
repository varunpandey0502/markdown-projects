import type { Command } from "commander";
import { readGlobalConfig } from "../../lib/settings.ts";
import { printSuccess, printError } from "../../output.ts";
import { MdpError } from "../../errors.ts";

export function registerProjectListCommand(parent: Command): void {
  parent
    .command("list")
    .description("List all registered projects")
    .option("--tag <tag>", "Filter projects by tag")
    .action(async (options) => {
      try {
        const settings = (await readGlobalConfig()) ?? {};
        let projects = settings.projects ?? [];

        if (options.tag) {
          projects = projects.filter((p) => p.tags.includes(options.tag));
        }

        // Collect tag descriptions for tags used by listed projects
        const allDescriptions = settings.tags ?? {};
        const tagDescriptions: Record<string, string> = {};
        for (const project of projects) {
          for (const tag of project.tags) {
            if (allDescriptions[tag]) {
              tagDescriptions[tag] = allDescriptions[tag];
            }
          }
        }

        printSuccess({
          projects,
          total: projects.length,
          tagDescriptions,
        });
      } catch (err) {
        printError(err);
        process.exit(err instanceof MdpError ? err.exitCode : 1);
      }
    });
}
