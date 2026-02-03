# Installation

## Requirements

- [Bun](https://bun.sh) v1.0.0 or higher

## Install

```bash
bun install -g github:varunpandey0502/markdown-projects
```

This installs the `mdp` command globally. Bun runs TypeScript directly — no build step needed.

## Verify

```bash
mdp --version
```

## Update

```bash
bun install -g github:varunpandey0502/markdown-projects
```

Re-running the install command pulls the latest version.

## Uninstall

```bash
bun remove -g markdown-projects
```

## Setup for Claude Code

Add the skill to your Claude Code configuration:

```bash
claude skill add /path/to/markdown-projects-cli/skills/mdp
```

Or use mdp directly via Bash tool calls after installing globally.
