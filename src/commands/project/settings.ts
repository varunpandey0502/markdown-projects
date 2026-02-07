import type { Command } from "commander";
import { readConfig } from "../../lib/config.ts";
import { getProjectFilePath } from "../../lib/settings.ts";
import { resolveProjectPath } from "../../lib/project-finder.ts";
import { getGlobalOptions } from "../../lib/command-utils.ts";
import { printSuccess, printError } from "../../output.ts";
import { MdpError } from "../../errors.ts";

export function registerSettingsCommand(program: Command): void {
  program
    .command("settings")
    .description("Display project settings")
    .action(async (_options, cmd) => {
      try {
        const globals = getGlobalOptions(cmd);
        const projectPath = await resolveProjectPath(globals.projectPath);
        const config = await readConfig(projectPath);

        printSuccess({
          projectPath,
          projectFile: getProjectFilePath(projectPath),
          config,
        });
      } catch (err) {
        printError(err);
        process.exit(err instanceof MdpError ? err.exitCode : 1);
      }
    });
}
