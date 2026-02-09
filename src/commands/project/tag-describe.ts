import type { Command } from "commander";
import { readGlobalConfig, writeGlobalConfig } from "../../lib/settings.ts";
import { printSuccess, printError } from "../../output.ts";
import { MdpError } from "../../errors.ts";

export function registerProjectTagDescribeCommand(parent: Command): void {
  parent
    .command("tag-describe")
    .description("Set, view, or remove a tag description")
    .argument("<tag>", "Tag name")
    .option("-d, --description <text>", "Description text for the tag")
    .option("--remove", "Remove the tag description")
    .action(async (tag: string, options) => {
      try {
        if (options.remove && options.description) {
          throw new MdpError(
            "INVALID_INPUT",
            "Cannot use --description and --remove together",
            {},
          );
        }

        const settings = (await readGlobalConfig()) ?? {};

        // Read mode: no flags provided
        if (!options.description && !options.remove) {
          const description = settings.tags?.[tag] ?? null;
          printSuccess({ tag, description });
          return;
        }

        if (!settings.tags) {
          settings.tags = {};
        }

        if (options.remove) {
          delete settings.tags[tag];
          if (Object.keys(settings.tags).length === 0) {
            delete settings.tags;
          }
          await writeGlobalConfig(settings);
          printSuccess({ tag, description: null });
          return;
        }

        settings.tags[tag] = options.description;
        await writeGlobalConfig(settings);
        printSuccess({ tag, description: options.description });
      } catch (err) {
        printError(err);
        process.exit(err instanceof MdpError ? err.exitCode : 1);
      }
    });
}
