import type { ProjectConfig, IssueStatuses, MilestoneStatuses, PriorityConfig, LabelConfig, TypeConfig } from "./types.ts";

export const PROJECT_DIR = ".mdp";
export const SETTINGS_FILE = "settings.json";
export const USER_SETTINGS_DIR = ".mdp";
export const USER_CONFIG_FILE = "config.json";
export const VERSION = "1.0.0";

// ── Shared across all presets ──

const SHARED_ISSUE_STATUSES: IssueStatuses = {
  triage: [],
  backlog: [{ name: "Backlog", description: "Not yet triaged" }],
  unstarted: [{ name: "To Do", description: "Ready to be worked on" }],
  started: [{ name: "In Progress", description: "Actively being worked on" }],
  completed: [{ name: "Done", description: "Work completed" }],
  canceled: [],
};

const SHARED_MILESTONE_STATUSES: MilestoneStatuses = {
  backlog: [],
  planned: [{ name: "Planning", description: "Defining scope and goals" }],
  in_progress: [
    { name: "Active", description: "In progress" },
    { name: "On Hold", description: "Temporarily paused" },
  ],
  completed: [{ name: "Completed", description: "All goals met" }],
  canceled: [],
};

const SHARED_PRIORITIES: PriorityConfig[] = [
  { name: "None", description: "No priority assigned" },
  { name: "Low", description: "Low priority" },
  { name: "Medium", description: "Medium priority" },
  { name: "High", description: "High priority" },
  { name: "Urgent", description: "Requires immediate attention" },
];

function buildPreset(issuePrefix: string, labels: LabelConfig[], types: TypeConfig[]): ProjectConfig {
  return {
    issues: {
      prefix: issuePrefix,
      statuses: SHARED_ISSUE_STATUSES,
      priorities: SHARED_PRIORITIES,
      labels,
      types,
    },
    milestones: {
      prefix: "M",
      statuses: SHARED_MILESTONE_STATUSES,
      priorities: SHARED_PRIORITIES,
      labels,
    },
  };
}

// ── Presets ──

export const PRESETS: Record<string, ProjectConfig> = {
  software: buildPreset("ISS", [
    { name: "bug", description: "Bug report" },
    { name: "enhancement", description: "Improvement to existing functionality" },
    { name: "documentation", description: "Documentation related" },
    { name: "security", description: "Security related" },
    { name: "frontend", description: "Frontend related" },
    { name: "backend", description: "Backend related" },
  ], [
    { name: "task", description: "General work item" },
    { name: "bug", description: "Something broken" },
    { name: "feature", description: "New functionality" },
    { name: "chore", description: "Maintenance, refactoring" },
    { name: "spike", description: "Research or investigation" },
  ]),

  marketing: buildPreset("MKT", [
    { name: "seo", description: "Search engine optimization" },
    { name: "paid", description: "Paid advertising" },
    { name: "organic", description: "Organic content" },
    { name: "brand", description: "Brand related" },
    { name: "copy", description: "Copywriting" },
    { name: "design", description: "Design related" },
  ], [
    { name: "campaign", description: "Marketing campaign" },
    { name: "content", description: "Content creation" },
    { name: "email", description: "Email marketing" },
    { name: "social", description: "Social media post" },
    { name: "analysis", description: "Analytics / reporting" },
  ]),

  design: buildPreset("DES", [
    { name: "ui", description: "User interface" },
    { name: "ux", description: "User experience" },
    { name: "branding", description: "Brand identity" },
    { name: "illustration", description: "Illustration work" },
    { name: "motion", description: "Motion graphics" },
  ], [
    { name: "design", description: "Design task" },
    { name: "review", description: "Design review" },
    { name: "research", description: "User research" },
    { name: "prototype", description: "Prototype / wireframe" },
    { name: "asset", description: "Asset creation" },
  ]),

  product: buildPreset("PRD", [
    { name: "mvp", description: "Minimum viable product" },
    { name: "growth", description: "Growth related" },
    { name: "retention", description: "User retention" },
    { name: "onboarding", description: "User onboarding" },
    { name: "mobile", description: "Mobile platform" },
    { name: "web", description: "Web platform" },
  ], [
    { name: "feature", description: "Product feature" },
    { name: "research", description: "User research" },
    { name: "experiment", description: "A/B test or experiment" },
    { name: "feedback", description: "User feedback item" },
    { name: "spec", description: "Product specification" },
  ]),

  "social-media": buildPreset("SOC", [
    { name: "instagram", description: "Instagram content" },
    { name: "twitter", description: "Twitter / X content" },
    { name: "linkedin", description: "LinkedIn content" },
    { name: "tiktok", description: "TikTok content" },
    { name: "youtube", description: "YouTube content" },
    { name: "facebook", description: "Facebook content" },
  ], [
    { name: "post", description: "Social media post" },
    { name: "story", description: "Story / reel content" },
    { name: "campaign", description: "Multi-post campaign" },
    { name: "engagement", description: "Community engagement task" },
    { name: "analysis", description: "Analytics review" },
  ]),

  generic: buildPreset("ISS", [
    { name: "urgent", description: "Urgent item" },
    { name: "documentation", description: "Documentation related" },
    { name: "question", description: "Question or discussion" },
  ], [
    { name: "task", description: "General work item" },
    { name: "milestone-task", description: "Milestone deliverable" },
    { name: "review", description: "Review task" },
  ]),
};

export const DEFAULT_PRESET = "software";
export const DEFAULT_CONFIG: ProjectConfig = PRESETS[DEFAULT_PRESET]!;
export const PRESET_NAMES = Object.keys(PRESETS);

// ── Templates ──

export function generateIssueTemplate(config: ProjectConfig): string {
  const defaultType = config.issues.types[0]?.name ?? "task";
  return `---
title:
type: ${defaultType}
status: Backlog
priority: None
labels: []
assignee: null
milestone: null
estimate: null
spent: null
dueDate: null
blockedBy: []
parent: null
relatedTo: []
checklist: []
log: []
---

## Description

[Describe the issue]

## Acceptance Criteria

[What defines "done" for this issue]
`;
}

export const DEFAULT_MILESTONE_TEMPLATE = `---
title:
status: Planning
priority: None
labels: []
startDate: null
dueDate: null
checklist: []
log: []
---

## Goals

[Describe the milestone goals]

## Deliverables

[List expected deliverables]
`;

// Preset-specific issue templates with domain-relevant body sections
export const PRESET_ISSUE_TEMPLATES: Record<string, string> = {
  software: `---
title:
type: task
status: Backlog
priority: None
labels: []
assignee: null
milestone: null
estimate: null
spent: null
dueDate: null
blockedBy: []
parent: null
relatedTo: []
checklist: []
log: []
---

## Description

[Describe the issue]

## Acceptance Criteria

[What defines "done" for this issue]
`,
  marketing: `---
title:
type: campaign
status: Backlog
priority: None
labels: []
assignee: null
milestone: null
estimate: null
spent: null
dueDate: null
blockedBy: []
parent: null
relatedTo: []
checklist: []
log: []
---

## Brief

[Campaign / content brief]

## Channel

[Target channel: email, social, PPC, etc.]

## Target Audience

[Who is this for?]

## KPIs

[Key performance indicators and targets]
`,
  design: `---
title:
type: design
status: Backlog
priority: None
labels: []
assignee: null
milestone: null
estimate: null
spent: null
dueDate: null
blockedBy: []
parent: null
relatedTo: []
checklist: []
log: []
---

## Description

[Describe the design task]

## Design Specs

[Dimensions, platform, constraints]

## References

[Figma links, mood boards, inspiration]
`,
  product: `---
title:
type: feature
status: Backlog
priority: None
labels: []
assignee: null
milestone: null
estimate: null
spent: null
dueDate: null
blockedBy: []
parent: null
relatedTo: []
checklist: []
log: []
---

## Problem Statement

[What problem are we solving?]

## User Story

As a [user], I want to [action] so that [benefit].

## Success Metrics

[How do we measure success?]
`,
  "social-media": `---
title:
type: post
status: Backlog
priority: None
labels: []
assignee: null
milestone: null
estimate: null
spent: null
dueDate: null
blockedBy: []
parent: null
relatedTo: []
checklist: []
log: []
---

## Content Brief

[Describe the content]

## Platform

[Target platform(s)]

## Hashtags

[Relevant hashtags]

## Schedule

[Target publish date / time]
`,
  generic: `---
title:
type: task
status: Backlog
priority: None
labels: []
assignee: null
milestone: null
estimate: null
spent: null
dueDate: null
blockedBy: []
parent: null
relatedTo: []
checklist: []
log: []
---

## Description

[Describe the issue]

## Acceptance Criteria

[What defines "done" for this issue]
`,
};
