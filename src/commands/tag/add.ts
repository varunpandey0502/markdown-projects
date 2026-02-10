import type { Command } from "commander";
import { readGlobalConfig, writeGlobalConfig } from "../../lib/settings.ts";
import { printSuccess, printError } from "../../output.ts";
import { MdpError } from "../../errors.ts";

export function registerTagAddCommand(parent: Command): void {
  parent
    .command("add")
    .description("Create a new tag")
    .argument("<tag>", "Tag name")
    .option("-d, --description <text>", "Description text for the tag", "")
    .action(async (tag: string, options) => {
      try {
        const settings = (await readGlobalConfig()) ?? {};

        if (!settings.tags) settings.tags = {};

        if (tag in settings.tags) {
          throw new MdpError(
            "ALREADY_EXISTS",
            `Tag "${tag}" already exists`,
            { tag },
          );
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
