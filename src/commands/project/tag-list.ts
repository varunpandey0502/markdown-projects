import type { Command } from "commander";
import { readGlobalConfig } from "../../lib/settings.ts";
import { printSuccess, printError } from "../../output.ts";
import { MdpError } from "../../errors.ts";

export function registerProjectTagListCommand(parent: Command): void {
  parent
    .command("tag-list")
    .description("List all tags with descriptions and project counts")
    .action(async () => {
      try {
        const settings = (await readGlobalConfig()) ?? {};
        const projects = settings.projects ?? [];
        const descriptions = settings.tags ?? {};

        // Collect all tags from projects + described tags
        const tagSet = new Set<string>();
        for (const project of projects) {
          for (const tag of project.tags) {
            tagSet.add(tag);
          }
        }
        for (const tag of Object.keys(descriptions)) {
          tagSet.add(tag);
        }

        const tags = Array.from(tagSet)
          .sort()
          .map((tag) => ({
            tag,
            description: descriptions[tag] ?? null,
            projectCount: projects.filter((p) => p.tags.includes(tag)).length,
          }));

        printSuccess({ tags, total: tags.length });
      } catch (err) {
        printError(err);
        process.exit(err instanceof MdpError ? err.exitCode : 1);
      }
    });
}
