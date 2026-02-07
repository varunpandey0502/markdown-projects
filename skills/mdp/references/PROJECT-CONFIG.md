# Project Configuration

Project configuration lives in `.mdp/project.json`. This file is the sole source of truth at runtime -- no merging, no fallbacks.

## Fields

| Field | Description |
|-------|-------------|
| `name` | Project name (required). Defaults to directory name at creation. |
| `description` | Optional one-line project description. |
| `instructions` | Optional free-text guidance for LLMs and collaborators. |
| `issues.prefix` | ID prefix for issues (e.g., `"ISS"` produces `ISS-1`, `ISS-2`, ...) |
| `issues.statuses` | Status categories mapped to arrays of `{ name, description }` statuses. |
| `issues.priorities` | Ordered list of `{ name, description }` priorities. |
| `issues.labels` | Available `{ name, description }` labels. |
| `issues.types` | Available `{ name, description }` issue types. |
| `milestones.prefix` | ID prefix for milestones (e.g., `"M"` produces `M-1`, `M-2`, ...) |
| `milestones.statuses` | Same structure as issue statuses with milestone-specific categories. |
| `milestones.priorities` | Same structure as issue priorities. |
| `milestones.labels` | Available labels for milestones. |

## Status Categories

Statuses are grouped by category. The system uses categories (not names) to determine completion, overdue detection, etc.

### Issue Status Categories

| Category | Meaning | Default Statuses |
|----------|---------|-----------------|
| `triage` | Inbox, needs review | *(none)* |
| `backlog` | Accepted, not yet planned | Backlog |
| `unstarted` | Planned, ready to start | To Do |
| `started` | Work in progress | In Progress |
| `completed` | Done successfully | Done |
| `canceled` | Won't do | *(none)* |

### Milestone Status Categories

| Category | Meaning | Default Statuses |
|----------|---------|-----------------|
| `backlog` | Not yet planned | *(none)* |
| `planned` | Scoped and planned | Planning |
| `in_progress` | Actively being worked on | Active, On Hold |
| `completed` | All goals met | Completed |
| `canceled` | Abandoned | *(none)* |

### How Categories Drive Behavior

- **Completion**: Issues in the `completed` category count as done.
- **Overdue**: Issues not in `completed` or `canceled` with a past due date are flagged.
- **Milestone progress**: Based on how many assigned issues are in `completed`.

## Default Priorities

None, Low, Medium, High, Urgent. Shared across issues and milestones.

## Validation

All validation is case-insensitive. Invalid values produce errors:

| Concept | Error Code |
|---------|-----------|
| Status | `INVALID_STATUS` |
| Priority | `INVALID_PRIORITY` |
| Type | `INVALID_TYPE` |
| Labels | `INVALID_LABEL` |

## Templates

Templates live in `.mdp/templates/` as markdown files with YAML frontmatter. Command-line flags override template values.

```bash
mdp issue create -t "Login bug" --template bug-report
mdp issue create -t "Login bug" --template bug-report --priority High
```

Template resolution: look for `{name}.md` in `.mdp/templates/`, parse frontmatter and body, merge with CLI flags (flags take precedence).

## Example project.json

```json
{
  "name": "my-project",
  "issues": {
    "prefix": "ISS",
    "statuses": {
      "triage": [],
      "backlog": [{ "name": "Backlog", "description": "Not yet triaged" }],
      "unstarted": [{ "name": "To Do", "description": "Ready to be worked on" }],
      "started": [{ "name": "In Progress", "description": "Actively being worked on" }],
      "completed": [{ "name": "Done", "description": "Work completed" }],
      "canceled": []
    },
    "priorities": [
      { "name": "None", "description": "No priority assigned" },
      { "name": "Low", "description": "Low priority" },
      { "name": "Medium", "description": "Medium priority" },
      { "name": "High", "description": "High priority" },
      { "name": "Urgent", "description": "Requires immediate attention" }
    ],
    "labels": [
      { "name": "bug", "description": "Bug report" },
      { "name": "enhancement", "description": "Improvement to existing functionality" }
    ],
    "types": [
      { "name": "task", "description": "General work item" },
      { "name": "bug", "description": "Something broken" },
      { "name": "feature", "description": "New functionality" }
    ]
  },
  "milestones": {
    "prefix": "M",
    "statuses": {
      "backlog": [],
      "planned": [{ "name": "Planning", "description": "Defining scope and goals" }],
      "in_progress": [{ "name": "Active", "description": "In progress" }],
      "completed": [{ "name": "Completed", "description": "All goals met" }],
      "canceled": []
    },
    "priorities": [
      { "name": "None", "description": "No priority assigned" },
      { "name": "Low", "description": "Low priority" },
      { "name": "Medium", "description": "Medium priority" },
      { "name": "High", "description": "High priority" },
      { "name": "Urgent", "description": "Requires immediate attention" }
    ],
    "labels": [
      { "name": "bug", "description": "Bug report" },
      { "name": "enhancement", "description": "Improvement to existing functionality" }
    ]
  }
}
```
