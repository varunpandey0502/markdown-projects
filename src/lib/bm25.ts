/**
 * Pure TypeScript BM25 search engine.
 * Zero dependencies — tokenizes, scores, and ranks documents.
 */

// ── Types ──

export type SearchableField = "title" | "content" | "log" | "checklist";

export interface SearchField {
  name: SearchableField;
  text: string;
}

export interface SearchDocument {
  id: string;
  entity: "issue" | "milestone" | "project";
  title: string;
  status: string;
  fields: SearchField[];
}

export interface FieldMatch {
  field: string;
  snippet: string;
}

export interface SearchResult {
  entity: "issue" | "milestone" | "project";
  id: string;
  title: string;
  status: string;
  score: number;
  matches: FieldMatch[];
}

// ── Constants ──

export const FIELD_WEIGHTS: Record<SearchableField, number> = {
  title: 3.0,
  log: 1.5,
  content: 1.0,
  checklist: 1.0,
};

const STOPWORDS = new Set([
  "a", "an", "and", "are", "as", "at", "be", "but", "by", "for",
  "from", "had", "has", "have", "he", "her", "his", "how", "i",
  "if", "in", "into", "is", "it", "its", "my", "no", "not", "of",
  "on", "or", "our", "out", "so", "than", "that", "the", "their",
  "them", "then", "there", "these", "they", "this", "to", "up",
  "was", "we", "were", "what", "when", "which", "who", "will",
  "with", "would", "you", "your",
]);

// ── BM25 Parameters ──

const K1 = 1.5;
const B = 0.75;

// ── Tokenizer ──

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 0);
}

function removeStopwords(tokens: string[]): string[] {
  const filtered = tokens.filter((t) => !STOPWORDS.has(t));
  // Fall back to raw terms if query is all stopwords
  return filtered.length > 0 ? filtered : tokens;
}

// ── Snippet Generation ──

const SNIPPET_CONTEXT = 80;

export function generateSnippet(text: string, queryTokens: string[]): string | null {
  const lowerText = text.toLowerCase();
  let bestPos = -1;
  let bestToken = "";

  // Find earliest matching token
  for (const token of queryTokens) {
    const pos = lowerText.indexOf(token);
    if (pos !== -1 && (bestPos === -1 || pos < bestPos)) {
      bestPos = pos;
      bestToken = token;
    }
  }

  if (bestPos === -1) return null;

  // Extract a window around the match
  const halfCtx = Math.floor(SNIPPET_CONTEXT / 2);
  let start = Math.max(0, bestPos - halfCtx);
  let end = Math.min(text.length, bestPos + bestToken.length + halfCtx);

  // Snap to word boundaries
  if (start > 0) {
    const spaceIdx = text.indexOf(" ", start);
    if (spaceIdx !== -1 && spaceIdx < bestPos) start = spaceIdx + 1;
  }
  if (end < text.length) {
    const spaceIdx = text.lastIndexOf(" ", end);
    if (spaceIdx > bestPos + bestToken.length) end = spaceIdx;
  }

  let snippet = text.slice(start, end);

  // Add ellipsis
  if (start > 0) snippet = "..." + snippet;
  if (end < text.length) snippet = snippet + "...";

  // Highlight all query terms with **term**
  for (const token of queryTokens) {
    const regex = new RegExp(`(${escapeRegex(token)})`, "gi");
    snippet = snippet.replace(regex, "**$1**");
  }

  return snippet;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// ── BM25 Scoring ──

interface DocTermInfo {
  totalTokens: number;
  fieldTokenCounts: Map<string, Map<string, number>>;
}

export function search(documents: SearchDocument[], query: string, limit = 20): SearchResult[] {
  const rawTokens = tokenize(query);
  if (rawTokens.length === 0) return [];

  const queryTokens = removeStopwords(rawTokens);

  // Build per-document term info and corpus stats
  const docInfos: DocTermInfo[] = [];
  const docFrequency = new Map<string, number>(); // term → number of docs containing it
  let totalDocLength = 0;

  for (const doc of documents) {
    let totalTokens = 0;
    const fieldTokenCounts = new Map<string, Map<string, number>>();

    for (const field of doc.fields) {
      const tokens = tokenize(field.text);
      totalTokens += tokens.length;

      const counts = new Map<string, number>();
      for (const t of tokens) {
        counts.set(t, (counts.get(t) ?? 0) + 1);
      }
      fieldTokenCounts.set(field.name, counts);
    }

    // Track which query terms appear in this doc (across all fields)
    const seenTerms = new Set<string>();
    for (const [, counts] of fieldTokenCounts) {
      for (const token of queryTokens) {
        if (counts.has(token)) seenTerms.add(token);
      }
    }
    for (const term of seenTerms) {
      docFrequency.set(term, (docFrequency.get(term) ?? 0) + 1);
    }

    totalDocLength += totalTokens;
    docInfos.push({ totalTokens, fieldTokenCounts });
  }

  const N = documents.length;
  if (N === 0) return [];

  const avgDl = totalDocLength / N;

  // Score each document
  const results: SearchResult[] = [];

  for (let i = 0; i < documents.length; i++) {
    const doc = documents[i]!;
    const info = docInfos[i]!;
    let totalScore = 0;
    const matches: FieldMatch[] = [];

    for (const field of doc.fields) {
      const counts = info.fieldTokenCounts.get(field.name);
      if (!counts) continue;

      const weight = FIELD_WEIGHTS[field.name as SearchableField] ?? 1.0;
      let fieldScore = 0;

      for (const token of queryTokens) {
        const tf = counts.get(token) ?? 0;
        if (tf === 0) continue;

        const df = docFrequency.get(token) ?? 0;
        // IDF with smoothing
        const idf = Math.log((N - df + 0.5) / (df + 0.5) + 1);
        // BM25 TF component
        const tfNorm = (tf * (K1 + 1)) / (tf + K1 * (1 - B + B * (info.totalTokens / avgDl)));
        fieldScore += idf * tfNorm;
      }

      if (fieldScore > 0) {
        totalScore += fieldScore * weight;
        const snippet = generateSnippet(field.text, queryTokens);
        if (snippet) {
          matches.push({ field: field.name, snippet });
        }
      }
    }

    if (totalScore > 0) {
      results.push({
        entity: doc.entity,
        id: doc.id,
        title: doc.title,
        status: doc.status,
        score: Math.round(totalScore * 100) / 100,
        matches,
      });
    }
  }

  // Sort by score descending
  results.sort((a, b) => b.score - a.score);

  return results.slice(0, limit);
}
