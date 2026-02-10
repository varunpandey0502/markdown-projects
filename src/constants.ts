import type { PresetConfig, ProjectConfig, IssueStatuses, MilestoneStatuses, PriorityConfig, LabelConfig, TypeConfig, IssueStatusCategory, MilestoneStatusCategory } from "./types.ts";

export const PROJECT_DIR = ".mdp";
export const PROJECT_FILE = "project.json";
export const USER_SETTINGS_DIR = ".mdp";
export const USER_CONFIG_FILE = "config.json";
export const VERSION = "1.2.0";

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

function buildPreset(issuePrefix: string, labels: LabelConfig[], types: TypeConfig[]): PresetConfig {
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

export const PRESETS: Record<string, PresetConfig> = {
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
export const DEFAULT_CONFIG: PresetConfig = PRESETS[DEFAULT_PRESET]!;
export const PRESET_NAMES = Object.keys(PRESETS);

// ── Templates ──

const ISSUE_STATUS_CATEGORY_ORDER: IssueStatusCategory[] = [
  "triage", "backlog", "unstarted", "started", "completed", "canceled",
];

const MILESTONE_STATUS_CATEGORY_ORDER: MilestoneStatusCategory[] = [
  "backlog", "planned", "in_progress", "completed", "canceled",
];

function getFirstIssueStatus(config: PresetConfig): string {
  for (const category of ISSUE_STATUS_CATEGORY_ORDER) {
    const statuses = config.issues.statuses[category];
    if (statuses.length > 0) {
      return statuses[0]!.name;
    }
  }
  return "";
}

function getFirstMilestoneStatus(config: PresetConfig): string {
  for (const category of MILESTONE_STATUS_CATEGORY_ORDER) {
    const statuses = config.milestones.statuses[category];
    if (statuses.length > 0) {
      return statuses[0]!.name;
    }
  }
  return "";
}

// Preset-specific body content (markdown only, no frontmatter)
const PRESET_ISSUE_BODY: Record<string, string> = {
  software: `## Description

[Describe the issue]

## Acceptance Criteria

[What defines "done" for this issue]
`,
  marketing: `## Brief

[Campaign / content brief]

## Channel

[Target channel: email, social, PPC, etc.]

## Target Audience

[Who is this for?]

## KPIs

[Key performance indicators and targets]
`,
  design: `## Description

[Describe the design task]

## Design Specs

[Dimensions, platform, constraints]

## References

[Figma links, mood boards, inspiration]
`,
  product: `## Problem Statement

[What problem are we solving?]

## User Story

As a [user], I want to [action] so that [benefit].

## Success Metrics

[How do we measure success?]
`,
  "social-media": `## Content Brief

[Describe the content]

## Platform

[Target platform(s)]

## Hashtags

[Relevant hashtags]

## Schedule

[Target publish date / time]
`,
  generic: `## Description

[Describe the issue]

## Acceptance Criteria

[What defines "done" for this issue]
`,
};

const DEFAULT_ISSUE_BODY = `## Description

[Describe the issue]

## Acceptance Criteria

[What defines "done" for this issue]
`;

const DEFAULT_MILESTONE_BODY = `## Goals

[Describe the milestone goals]

## Deliverables

[List expected deliverables]
`;

export function generateIssueTemplate(config: PresetConfig, presetName?: string): string {
  const defaultStatus = getFirstIssueStatus(config);
  const body = (presetName && PRESET_ISSUE_BODY[presetName]) ?? DEFAULT_ISSUE_BODY;
  return `---
title:
type: null
status: ${defaultStatus}
priority: null
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

${body}`;
}

export function generateMilestoneTemplate(config: PresetConfig): string {
  const defaultStatus = getFirstMilestoneStatus(config);
  return `---
title:
status: ${defaultStatus}
priority: null
labels: []
startDate: null
dueDate: null
checklist: []
log: []
---

${DEFAULT_MILESTONE_BODY}`;
}
