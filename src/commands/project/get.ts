import type { Command } from "commander";
import { MdpError } from "../../errors.ts";
import { readProjectMd } from "../../lib/settings.ts";
import { resolveProjectPath } from "../../lib/project-finder.ts";
import { getGlobalOptions } from "../../lib/command-utils.ts";
import { printSuccess, printError, verboseLog } from "../../output.ts";

export function registerProjectGetCommand(program: Command): void {
  program
    .command("get")
    .description("Get project identity, health, and log")
    .option("--include-content", "Include markdown body in output", true)
    .option("--no-include-content", "Exclude markdown body from output")
    .action(async (options, cmd) => {
      try {
        const globals = getGlobalOptions(cmd);
        const projectPath = await resolveProjectPath(globals.projectPath);

        verboseLog(`Getting project info from ${projectPath}`);

        const projectData = await readProjectMd(projectPath);

        const output: Record<string, unknown> = {
          title: projectData.title,
          description: projectData.description ?? null,
          instructions: projectData.instructions ?? null,
          health: projectData.health ?? null,
          log: projectData.log,
          createdAt: projectData.createdAt,
          updatedAt: projectData.updatedAt,
          filePath: projectData.filePath,
        };

        if (options.includeContent) {
          output.content = projectData.content ?? "";
        }

        printSuccess(output);
      } catch (err) {
        printError(err);
        process.exit(err instanceof MdpError ? err.exitCode : 1);
      }
    });
}
