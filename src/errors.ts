export class MdpError extends Error {
  constructor(
    public code: string,
    message: string,
    public details: Record<string, unknown> = {},
    public exitCode: number = 1,
  ) {
    super(message);
    this.name = "MdpError";
  }
}

export function projectNotFound(projectPath: string): MdpError {
  return new MdpError(
    "PROJECT_NOT_FOUND",
    `No .mdp/ directory found at ${projectPath}`,
    { projectPath },
    2,
  );
}

export function issueNotFound(id: string, projectPath?: string): MdpError {
  return new MdpError(
    "ISSUE_NOT_FOUND",
    `Issue ${id} not found`,
    { id, ...(projectPath ? { projectPath } : {}) },
  );
}

export function milestoneNotFound(id: string, projectPath?: string): MdpError {
  return new MdpError(
    "MILESTONE_NOT_FOUND",
    `Milestone ${id} not found`,
    { id, ...(projectPath ? { projectPath } : {}) },
  );
}

export function templateNotFound(name: string): MdpError {
  return new MdpError(
    "TEMPLATE_NOT_FOUND",
    `Template "${name}" not found`,
    { name },
  );
}

export function invalidStatus(status: string, validStatuses: string[]): MdpError {
  return new MdpError(
    "INVALID_STATUS",
    `Invalid status "${status}". Valid statuses: ${validStatuses.join(", ")}`,
    { status, validStatuses },
  );
}

export function invalidPriority(priority: string, validPriorities: string[]): MdpError {
  return new MdpError(
    "INVALID_PRIORITY",
    `Invalid priority "${priority}". Valid priorities: ${validPriorities.join(", ")}`,
    { priority, validPriorities },
  );
}

export function invalidType(type: string, validTypes: string[]): MdpError {
  return new MdpError(
    "INVALID_TYPE",
    `Invalid type "${type}". Valid types: ${validTypes.join(", ")}`,
    { type, validTypes },
  );
}

export function invalidDate(dateStr: string): MdpError {
  return new MdpError(
    "INVALID_DATE",
    `Invalid date "${dateStr}". Expected format: YYYY-MM-DD`,
    { date: dateStr },
  );
}

export function invalidId(id: string, context: string): MdpError {
  return new MdpError(
    "INVALID_ID",
    `Referenced ID "${id}" does not exist (${context})`,
    { id, context },
  );
}

export function missingRequired(field: string): MdpError {
  return new MdpError(
    "MISSING_REQUIRED",
    `Missing required field: ${field}`,
    { field },
  );
}

export function alreadyExists(path: string): MdpError {
  return new MdpError(
    "ALREADY_EXISTS",
    `Project already exists at ${path}. Use --force to overwrite.`,
    { path },
  );
}

export function circularDependency(issueId: string, targetId: string, chain: string[]): MdpError {
  return new MdpError(
    "CIRCULAR_DEPENDENCY",
    `Adding dependency on ${targetId} would create a cycle: ${chain.join(" -> ")}`,
    { issueId, targetId, chain },
  );
}

export function writeError(path: string, reason: string): MdpError {
  return new MdpError(
    "WRITE_ERROR",
    `Failed to write to ${path}: ${reason}`,
    { path, reason },
  );
}

export function parseError(path: string, reason: string): MdpError {
  return new MdpError(
    "PARSE_ERROR",
    `Failed to parse ${path}: ${reason}`,
    { path, reason },
  );
}

export function configError(reason: string): MdpError {
  return new MdpError(
    "CONFIG_ERROR",
    `Configuration error: ${reason}`,
    { reason },
  );
}
