# Project Commands

## Create Project

```bash
mdp project create -p <path> [options]
```

Create a new markdown project and register it.

| Flag | Short | Default | Description |
|------|-------|---------|-------------|
| `--force` | `-F` | `false` | Overwrite existing `.mdp/` directory |
| `--preset <name>` | | `"software"` | Project preset |
| `--with-templates` | | `true` | Create default template files |
| `--no-with-templates` | | | Skip creating template files |
| `--issue-prefix <prefix>` | | `"ISS"` | Prefix for issue IDs |
| `--milestone-prefix <prefix>` | | `"M"` | Prefix for milestone IDs |
| `--tags <tags>` | | | Comma-separated tags for grouping |
| `--title <title>` | | directory name | Project title |
| `--name <name>` | | | Alias for `--title` |
| `--description <desc>` | | | One-line project description |
| `--instructions <text>` | | | Free-text guidance for LLMs and collaborators |

Available presets: `software`, `marketing`, `design`, `product`, `social-media`, `generic`.

Creates `.mdp/` with `settings.json` (schema config), `project.md` (project identity), `issues/`, `milestones/`, `docs/`, `templates/`. Registers the project in `~/.mdp/settings.json`.

## Get Project

```bash
mdp project get -p <path> [--no-include-content]
```

Get project identity, health, log, and body content from `.mdp/project.md`.

## Add Project

```bash
mdp project add <path> [--tags <tags>]
```

Register an existing project without creating any files.

## List Projects

```bash
mdp project list [--tag <tag>]
```

List all registered projects. Optionally filter by tag.

## Remove Project

```bash
mdp project remove <path>
```

Unregister a project. Does not delete any files.

## Tag Project

```bash
mdp project tag <path> --add <tags>
mdp project tag <path> --remove <tags>
```

Add or remove tags from a registered project. Tags added via `--add` are auto-created in the global tag list if they don't already exist.

## Show Settings

```bash
mdp project settings -p <path>
```

Display the project schema configuration from `.mdp/settings.json`.

## Show Stats

```bash
mdp project stats -p <path>
```

Show project statistics: project title and health, issue counts by status, priority, type, label, and assignee; estimate/spent totals; blocked and overdue counts; milestone counts by status.

## Project Log

Manage log entries on the project. Supports optional health tracking (`on-track`, `at-risk`, `off-track`).

```bash
mdp project log add -p <path> -b "message" [--author <name>] [--health on-track|at-risk|off-track] [--dry-run]
mdp project log list -p <path>
mdp project log get -p <path> --index <n>
mdp project log update -p <path> --index <n> [-b <body>] [--author <name>] [--health <health>] [--dry-run]
mdp project log delete -p <path> --index <n> [--dry-run]
```

When `--health` is provided on `add` or `update`, the health value is stored both in the log entry AND propagated to the top-level `health` field in `project.md` frontmatter.

## Fix Project

```bash
mdp project fix -p <path> [--dry-run]
```

Fix folder names to match frontmatter data. Renames folders to match the `{id}-{slug}` convention based on frontmatter title.
