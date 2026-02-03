# Markdown Projects (`mdp`)

A CLI tool for file-based project management. All data lives as markdown files with YAML frontmatter inside a `.mdp/` directory. No database, no server, no lock-in — just plain text files that work with git.

Designed for AI agents and automation. JSON-first output, non-interactive, fully scriptable.

## Installation

### As a Skill

Install the `markdown-projects` skill to give an agent full context on how to install and use the tool:

```bash
npx skills add varunpandey0502/markdown-projects/
```

Once the skill is installed, the agent can install the CLI, initialize projects, and manage issues and milestones autonomously.

### Manual Installation

Requires [Bun](https://bun.sh):

```bash
bun install -g github:varunpandey0502/markdown-projects
mdp --version
```

## Quick Start

```bash
# Initialize a project
mdp project create -p .

# Create a milestone
mdp milestone create -p . -t "v1.0 Release" --due-date 2025-06-01

# Create and track issues
mdp issue create -p . -t "Add authentication" --type feature --milestone M-001
mdp issue update -p . --id ISS-001 --status "In Progress"
mdp issue comment -p . --id ISS-001 --body "Starting implementation"

# Check progress
mdp milestone progress -p . --id M-001
```

## Project Structure

```
.mdp/
├── settings.json          # Project configuration (committed)
├── issues/                # Issues organized by status
│   ├── backlog/
│   ├── to_do/
│   ├── in_progress/
│   └── done/
├── milestones/            # Milestones organized by status
│   ├── planning/
│   ├── active/
│   ├── on_hold/
│   └── completed/
├── docs/                  # Documentation files
└── templates/             # Issue/milestone templates
```

## Commands

### Project

| Command | Description |
|---------|-------------|
| `mdp project create` | Create a new project |
| `mdp project add` | Register an existing project |
| `mdp project list` | List registered projects |
| `mdp project remove` | Unregister a project |
| `mdp project tag` | Add/remove tags from a project |
| `mdp project settings` | Show project configuration |
| `mdp project stats` | Show project statistics |
| `mdp project fix` | Fix folder structure to match frontmatter |

### Issues

| Command | Description |
|---------|-------------|
| `mdp issue create` | Create a new issue |
| `mdp issue list` | List issues with filtering and sorting |
| `mdp issue get` | Get a single issue by ID |
| `mdp issue update` | Update issue fields |
| `mdp issue delete` | Delete an issue and clean up references |
| `mdp issue comment` | Add a log entry to an issue |

### Milestones

| Command | Description |
|---------|-------------|
| `mdp milestone create` | Create a new milestone |
| `mdp milestone list` | List milestones with filtering and sorting |
| `mdp milestone get` | Get a single milestone by ID |
| `mdp milestone update` | Update milestone fields |
| `mdp milestone delete` | Delete a milestone and clean up references |
| `mdp milestone progress` | Show detailed progress report |
| `mdp milestone comment` | Add a log entry to a milestone |

### Global Flags

Every command accepts: `-p <path>` (project path), `-f json|table` (output format), `-q` (quiet), `-V` (verbose).

## Documentation

Full documentation: [markdown-projects.vercel.app](https://markdown-projects.vercel.app)

## License

MIT
