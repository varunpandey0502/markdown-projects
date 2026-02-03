import type { RawIssue } from "./issue-reader.ts";

/**
 * Detects if adding a dependency from `issueId` -> `targetId` (meaning issueId is blocked by targetId)
 * would create a cycle in the dependency graph.
 *
 * Returns the cycle chain if a cycle is detected, or null if safe.
 */
export function detectCycle(
  issueId: string,
  targetId: string,
  allIssues: RawIssue[],
): string[] | null {
  // Build maps: lowercase key -> original ID, and lowercase key -> blockedBy (lowercase)
  const idMap = new Map<string, string>();
  const blockedByMap = new Map<string, string[]>();
  for (const issue of allIssues) {
    const key = issue.id.toLowerCase();
    idMap.set(key, issue.id);
    blockedByMap.set(key, issue.blockedBy.map((b) => b.toLowerCase()));
  }

  // Temporarily add the new edge
  const issueKey = issueId.toLowerCase();
  const targetKey = targetId.toLowerCase();
  idMap.set(issueKey, issueId);
  idMap.set(targetKey, targetId);
  const existing = blockedByMap.get(issueKey) ?? [];
  blockedByMap.set(issueKey, [...existing, targetKey]);

  // Resolve a lowercase key to its original-case ID
  const resolve = (key: string): string => idMap.get(key) ?? key;

  // BFS from targetId following blockedBy edges to see if we reach issueId
  const visited = new Set<string>();
  const queue: Array<{ id: string; path: string[] }> = [
    { id: targetKey, path: [resolve(issueKey), resolve(targetKey)] },
  ];

  while (queue.length > 0) {
    const current = queue.shift()!;

    if (current.id === issueKey) {
      return current.path;
    }

    if (visited.has(current.id)) continue;
    visited.add(current.id);

    const deps = blockedByMap.get(current.id) ?? [];
    for (const dep of deps) {
      if (!visited.has(dep)) {
        queue.push({ id: dep, path: [...current.path, resolve(dep)] });
      }
    }
  }

  return null;
}
