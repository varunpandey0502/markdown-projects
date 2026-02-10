import type { Command } from "commander";
import { readGlobalConfig, writeGlobalConfig } from "../../lib/settings.ts";
import { printSuccess, printError } from "../../output.ts";
import { MdpError, tagNotFound, tagInUse } from "../../errors.ts";

export function registerTagRemoveCommand(parent: Command): void {
  parent
    .command("remove")
    .description("Remove a tag")
    .argument("<tag>", "Tag name")
    .option("--force", "Also strip the tag from all projects", false)
    .action(async (tag: string, options) => {
      try {
        const settings = (await readGlobalConfig()) ?? {};
        const tags = settings.tags ?? {};

        if (!(tag in tags)) {
          throw tagNotFound(tag);
        }

        // Check if any projects use this tag
        const projects = settings.projects ?? [];
        const usingProjects = projects.filter((p) => p.tags.includes(tag));

        if (usingProjects.length > 0 && !options.force) {
          throw tagInUse(
            tag,
            usingProjects.length,
            usingProjects.map((p) => p.path),
          );
        }

        // Strip tag from all projects if --force
        if (options.force) {
          for (const project of usingProjects) {
            project.tags = project.tags.filter((t) => t !== tag);
          }
        }

        // Remove the tag
        delete tags[tag];
        if (Object.keys(tags).length === 0) {
          delete settings.tags;
        } else {
          settings.tags = tags;
        }

        await writeGlobalConfig(settings);

        printSuccess({
          tag,
          removedFromProjects: options.force ? usingProjects.map((p) => p.path) : [],
        });
      } catch (err) {
        printError(err);
        process.exit(err instanceof MdpError ? err.exitCode : 1);
      }
    });
}
