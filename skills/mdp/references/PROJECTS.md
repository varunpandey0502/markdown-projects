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
| `--name <name>` | | directory name | Project name |
| `--description <desc>` | | | One-line project description |
| `--instructions <text>` | | | Free-text guidance for LLMs and collaborators |

Available presets: `software`, `marketing`, `design`, `product`, `social-media`, `generic`.

Creates `.mdp/` with `project.json`, `issues/`, `milestones/`, `docs/`, `templates/`. Registers the project in `~/.mdp/config.json`.

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

Add or remove tags from a registered project.

## Show Settings

```bash
mdp project settings -p <path>
```

Display the project configuration from `.mdp/project.json`.

## Show Stats

```bash
mdp project stats -p <path>
```

Show project statistics: issue counts by status, priority, type, label, and assignee; estimate/spent totals; blocked and overdue counts; milestone counts by status.

## Fix Project

```bash
mdp project fix -p <path> [--dry-run]
```

Fix folder names to match frontmatter data. Renames folders to match the `{id}-{slug}` convention based on frontmatter title.
