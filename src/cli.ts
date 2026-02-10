#!/usr/bin/env bun

import { Command } from "commander";
import { VERSION } from "./constants.ts";
import { setQuiet, setVerbose, setFormat, printError } from "./output.ts";
import { MdpError } from "./errors.ts";
import { getDefaultFormat } from "./lib/settings.ts";

// ── Command registrations ──
import { registerProjectCreateCommand } from "./commands/project/init.ts";
import { registerProjectGetCommand } from "./commands/project/get.ts";
import { registerSettingsCommand } from "./commands/project/settings.ts";
import { registerProjectListCommand } from "./commands/project/list.ts";
import { registerProjectAddCommand } from "./commands/project/add.ts";
import { registerProjectRemoveCommand } from "./commands/project/remove.ts";
import { registerProjectTagCommand } from "./commands/project/tag.ts";
import { registerProjectLogCommand } from "./commands/project/log.ts";
import { registerTagListCommand } from "./commands/tag/list.ts";
import { registerTagAddCommand } from "./commands/tag/add.ts";
import { registerTagUpdateCommand } from "./commands/tag/update.ts";
import { registerTagRemoveCommand } from "./commands/tag/remove.ts";
import { registerStatsCommand } from "./commands/project/stats.ts";
import { registerFixCommand } from "./commands/project/sync.ts";
import { registerIssueCreateCommand } from "./commands/issue/create.ts";
import { registerIssueListCommand } from "./commands/issue/list.ts";
import { registerIssueGetCommand } from "./commands/issue/get.ts";
import { registerIssueUpdateCommand } from "./commands/issue/update.ts";
import { registerIssueDeleteCommand } from "./commands/issue/delete.ts";
import { registerIssueLogCommand } from "./commands/issue/log.ts";
import { registerIssueBatchCreateCommand } from "./commands/issue/batch-create.ts";
import { registerIssueBatchUpdateCommand } from "./commands/issue/batch-update.ts";
import { registerMilestoneCreateCommand } from "./commands/milestone/create.ts";
import { registerMilestoneListCommand } from "./commands/milestone/list.ts";
import { registerMilestoneGetCommand } from "./commands/milestone/get.ts";
import { registerMilestoneUpdateCommand } from "./commands/milestone/update.ts";
import { registerMilestoneDeleteCommand } from "./commands/milestone/delete.ts";
import { registerMilestoneProgressCommand } from "./commands/milestone/progress.ts";
import { registerMilestoneLogCommand } from "./commands/milestone/log.ts";
import { registerSearchCommand } from "./commands/search.ts";

const program = new Command();

program
  .name("mdp")
  .version(VERSION, "-v, --version")
  .description("File-based project management CLI using markdown")
  .option("-p, --project-path <path>", "Path to project root (required for most commands)")
  .option("-f, --format <fmt>", "Output format: json, table")
  .option("-q, --quiet", "Suppress all output")
  .option("-V, --verbose", "Enable debug logging to stderr");

// Apply global options before each command
program.hook("preAction", async (thisCommand) => {
  const opts = thisCommand.opts();
  if (opts.quiet) setQuiet(true);
  if (opts.verbose) setVerbose(true);
  if (opts.format) {
    setFormat(opts.format);
  } else {
    setFormat(await getDefaultFormat());
  }
});

// ── Project subcommand group ──
const projectCmd = program
  .command("project")
  .description("Manage projects");

registerProjectCreateCommand(projectCmd);
registerProjectGetCommand(projectCmd);
registerProjectAddCommand(projectCmd);
registerProjectListCommand(projectCmd);
registerProjectRemoveCommand(projectCmd);
registerProjectTagCommand(projectCmd);
registerSettingsCommand(projectCmd);
registerStatsCommand(projectCmd);
registerFixCommand(projectCmd);
registerProjectLogCommand(projectCmd);

// ── Tag subcommand group ──
const tagCmd = program
  .command("tag")
  .description("Manage tags");

registerTagListCommand(tagCmd);
registerTagAddCommand(tagCmd);
registerTagUpdateCommand(tagCmd);
registerTagRemoveCommand(tagCmd);

// ── Issue subcommand group ──
const issueCmd = program
  .command("issue")
  .description("Manage issues");

registerIssueCreateCommand(issueCmd);
registerIssueListCommand(issueCmd);
registerIssueGetCommand(issueCmd);
registerIssueUpdateCommand(issueCmd);
registerIssueDeleteCommand(issueCmd);
registerIssueLogCommand(issueCmd);
registerIssueBatchCreateCommand(issueCmd);
registerIssueBatchUpdateCommand(issueCmd);

// ── Milestone subcommand group ──
const milestoneCmd = program
  .command("milestone")
  .description("Manage milestones");

registerMilestoneCreateCommand(milestoneCmd);
registerMilestoneListCommand(milestoneCmd);
registerMilestoneGetCommand(milestoneCmd);
registerMilestoneUpdateCommand(milestoneCmd);
registerMilestoneDeleteCommand(milestoneCmd);
registerMilestoneProgressCommand(milestoneCmd);
registerMilestoneLogCommand(milestoneCmd);

// ── Top-level commands ──
registerSearchCommand(program);

// Export for use in later steps
export { issueCmd, milestoneCmd };

// Error handling
program.exitOverride((err) => {
  if (err.code === "commander.helpDisplayed" || err.code === "commander.version") {
    process.exit(0);
  }
});

// Parse
try {
  await program.parseAsync(process.argv);
} catch (err) {
  if (err instanceof MdpError) {
    printError(err);
    process.exit(err.exitCode);
  }
  // Commander errors (help, version) are handled by exitOverride
}
