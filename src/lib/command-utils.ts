import type { Command } from "commander";

export interface GlobalOptions {
  projectPath?: string;
  format: string;
  quiet?: boolean;
  verbose?: boolean;
}

export function getGlobalOptions(cmd: Command): GlobalOptions {
  // Walk up the command chain to get root program options
  let current: Command | null = cmd;
  while (current?.parent) {
    current = current.parent;
  }
  return current?.opts() as GlobalOptions ?? { format: "json" };
}
