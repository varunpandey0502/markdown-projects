# Global Configuration

Global configuration lives at `~/.mdp/config.json`. Stores the project registry, custom presets, and default preferences.

## Project Registry

The `projects` array tracks all known projects on your machine.

```bash
mdp project add <path> --tags "work,backend"   # Register a project
mdp project list --tag work                     # List projects by tag
mdp project remove <path>                       # Unregister a project
mdp project tag <path> --add "v2" --remove "v1" # Manage tags
```

Projects are automatically registered when created with `mdp project create`.

## Tag Descriptions

The `tags` object maps tag names to descriptions. This provides context about what a tag represents (e.g., a company, team, or domain) so LLMs and collaborators can understand project groupings.

```bash
mdp project tag-describe acme -d "Acme Corp — B2B SaaS for supply chain management"
mdp project tag-describe acme          # View a tag's description
mdp project tag-describe acme --remove # Remove a tag's description
mdp project tag-list                   # List all tags with descriptions and project counts
```

Tag descriptions are also included in `mdp project list` output via the `tagDescriptions` field.

## Presets

A preset is a one-time configuration template used at project creation. After creation, the preset has no further effect -- `project.json` is self-contained.

### Built-in Presets

| Preset | Issue Prefix | Types |
|--------|-------------|-------|
| `software` | `ISS` | task, bug, feature, chore, spike |
| `marketing` | `MKT` | campaign, content, email, social, analysis |
| `design` | `DES` | design, review, research, prototype, asset |
| `product` | `PRD` | feature, research, experiment, feedback, spec |
| `social-media` | `SOC` | post, story, campaign, engagement, analysis |
| `generic` | `ISS` | task, milestone-task, review |

All presets share the same statuses and priorities.

### Custom Presets

Define custom presets in `~/.mdp/config.json` under the `presets` key. Each preset must contain the full `issues` and `milestones` objects (same schema as `project.json`).

```bash
mdp project create -p . --preset my-team
```

If a custom preset has the same name as a built-in preset, the custom one takes priority.

## Defaults

| Field | Default | Description |
|-------|---------|-------------|
| `defaults.preset` | `"software"` | Default preset when `--preset` is not specified |
| `defaults.format` | `"json"` | Default output format when `-f` is not specified |

## Example config.json

```json
{
  "projects": [
    { "path": "/home/user/myapp", "tags": ["work", "backend"] },
    { "path": "/home/user/blog", "tags": ["personal"] }
  ],
  "tags": {
    "work": "Acme Corp — B2B SaaS for supply chain management",
    "backend": "Backend services and APIs"
  },
  "presets": {
    "my-team": {
      "issues": {
        "prefix": "TEAM",
        "statuses": { ... },
        "priorities": [ ... ],
        "labels": [ ... ],
        "types": [ ... ]
      },
      "milestones": {
        "prefix": "M",
        "statuses": { ... },
        "priorities": [ ... ],
        "labels": [ ... ]
      }
    }
  },
  "defaults": {
    "preset": "my-team",
    "format": "json"
  }
}
```
