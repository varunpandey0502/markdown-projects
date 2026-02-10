import type { Command } from "commander";
import { readGlobalConfig, writeGlobalConfig } from "../../lib/settings.ts";
import { printSuccess, printError } from "../../output.ts";
import { MdpError, tagNotFound, invalidInput } from "../../errors.ts";

export function registerTagUpdateCommand(parent: Command): void {
  parent
    .command("update")
    .description("Update a tag's description")
    .argument("<tag>", "Tag name")
    .option("-d, --description <text>", "New description text for the tag")
    .action(async (tag: string, options) => {
      try {
        if (options.description === undefined) {
          throw invalidInput("Missing required flag: -d/--description", { flag: "--description" });
        }

        const settings = (await readGlobalConfig()) ?? {};
        const tags = settings.tags ?? {};

        if (!(tag in tags)) {
          throw tagNotFound(tag);
        }

        tags[tag] = options.description;
        settings.tags = tags;
        await writeGlobalConfig(settings);

        printSuccess({ tag, description: options.description });
      } catch (err) {
        printError(err);
        process.exit(err instanceof MdpError ? err.exitCode : 1);
      }
    });
}
