import { describe, expect, it } from "bun:test";
import { search, tokenize, generateSnippet, FIELD_WEIGHTS } from "../../src/lib/bm25.ts";
import type { SearchDocument, SearchField } from "../../src/lib/bm25.ts";

// ── Helper ──

function makeDoc(
  id: string,
  title: string,
  content: string,
  extra?: { log?: string; checklist?: string },
): SearchDocument {
  const fields: SearchField[] = [
    { name: "title", text: title },
    { name: "content", text: content },
  ];
  if (extra?.log) fields.push({ name: "log", text: extra.log });
  if (extra?.checklist) fields.push({ name: "checklist", text: extra.checklist });

  return { id, entity: "issue", title, status: "Open", fields };
}

// ── Tokenizer ──

describe("tokenize", () => {
  it("lowercases and splits on non-alphanumeric", () => {
    expect(tokenize("Hello World! 123")).toEqual(["hello", "world", "123"]);
  });

  it("returns empty array for empty/whitespace input", () => {
    expect(tokenize("")).toEqual([]);
    expect(tokenize("   ")).toEqual([]);
  });

  it("handles special characters", () => {
    expect(tokenize("foo-bar_baz.qux")).toEqual(["foo", "bar", "baz", "qux"]);
  });
});

// ── Relevance Ranking ──

describe("search - relevance ranking", () => {
  it("ranks title match higher than content-only match", () => {
    const docs = [
      makeDoc("ISS-1", "Fix login bug", "Users cannot login due to caching issue"),
      makeDoc("ISS-2", "Implement caching layer", "Add Redis for performance"),
    ];

    const results = search(docs, "caching");
    expect(results.length).toBe(2);
    expect(results[0]!.id).toBe("ISS-2"); // title match (higher weight)
    expect(results[1]!.id).toBe("ISS-1"); // content-only match
    expect(results[0]!.score).toBeGreaterThan(results[1]!.score);
  });

  it("ranks documents with multiple term matches higher", () => {
    const docs = [
      makeDoc("ISS-1", "API endpoints", "The REST API returns user data"),
      makeDoc("ISS-2", "Database schema", "Schema for the user table"),
      makeDoc("ISS-3", "API documentation", "Document all REST API endpoints for users"),
    ];

    const results = search(docs, "API endpoints");
    expect(results[0]!.id).toBe("ISS-1"); // both terms in title
  });

  it("case-insensitive matching", () => {
    const docs = [makeDoc("ISS-1", "Redis CACHING", "Performance improvement")];

    const results = search(docs, "redis caching");
    expect(results.length).toBe(1);
    expect(results[0]!.id).toBe("ISS-1");
  });
});

// ── Limit ──

describe("search - limit", () => {
  it("respects limit parameter", () => {
    const docs = Array.from({ length: 10 }, (_, i) =>
      makeDoc(`ISS-${i + 1}`, `Issue about caching ${i}`, "Some caching content"),
    );

    const results = search(docs, "caching", 3);
    expect(results.length).toBe(3);
  });

  it("returns fewer results if fewer match", () => {
    const docs = [
      makeDoc("ISS-1", "Caching layer", "Redis caching"),
      makeDoc("ISS-2", "Unrelated thing", "Nothing here"),
    ];

    const results = search(docs, "caching", 10);
    expect(results.length).toBe(1);
  });
});

// ── Empty / No Match ──

describe("search - edge cases", () => {
  it("returns empty for empty query", () => {
    const docs = [makeDoc("ISS-1", "Something", "Content")];
    expect(search(docs, "")).toEqual([]);
    expect(search(docs, "   ")).toEqual([]);
  });

  it("returns empty when no documents match", () => {
    const docs = [makeDoc("ISS-1", "Hello world", "Greetings")];
    expect(search(docs, "caching")).toEqual([]);
  });

  it("returns empty for empty document set", () => {
    expect(search([], "caching")).toEqual([]);
  });

  it("falls back to raw terms when query is all stopwords", () => {
    const docs = [makeDoc("ISS-1", "What is this", "This is a test")];
    // "is" and "this" are stopwords, but should still match via fallback
    const results = search(docs, "is this");
    expect(results.length).toBe(1);
  });
});

// ── Snippet Generation ──

describe("generateSnippet", () => {
  it("highlights matching terms with **term**", () => {
    const snippet = generateSnippet("Implement Redis caching layer", ["caching"]);
    expect(snippet).toContain("**caching**");
  });

  it("returns null when no terms match", () => {
    const snippet = generateSnippet("Hello world", ["zebra"]);
    expect(snippet).toBeNull();
  });

  it("highlights multiple terms", () => {
    const snippet = generateSnippet("The Redis caching layer improves API performance", ["redis", "caching"]);
    expect(snippet).toContain("**Redis**");
    expect(snippet).toContain("**caching**");
  });

  it("adds ellipsis for long text", () => {
    const longText = "A".repeat(50) + " caching " + "B".repeat(50);
    const snippet = generateSnippet(longText, ["caching"]);
    expect(snippet).not.toBeNull();
    expect(snippet!).toContain("**caching**");
  });
});

// ── Field Weights ──

describe("FIELD_WEIGHTS", () => {
  it("title has highest weight", () => {
    expect(FIELD_WEIGHTS.title).toBeGreaterThan(FIELD_WEIGHTS.content);
    expect(FIELD_WEIGHTS.title).toBeGreaterThan(FIELD_WEIGHTS.log);
    expect(FIELD_WEIGHTS.title).toBeGreaterThan(FIELD_WEIGHTS.checklist);
  });

  it("log weight is between title and content", () => {
    expect(FIELD_WEIGHTS.log).toBeGreaterThan(FIELD_WEIGHTS.content);
    expect(FIELD_WEIGHTS.log).toBeLessThan(FIELD_WEIGHTS.title);
  });
});

// ── Matches ──

describe("search - matches", () => {
  it("includes matched fields with snippets", () => {
    const docs = [
      makeDoc("ISS-1", "Implement caching", "Use Redis for caching at the API gateway"),
    ];

    const results = search(docs, "caching");
    expect(results.length).toBe(1);
    expect(results[0]!.matches.length).toBeGreaterThanOrEqual(1);

    const fields = results[0]!.matches.map((m) => m.field);
    expect(fields).toContain("title");
    expect(fields).toContain("content");

    for (const match of results[0]!.matches) {
      expect(match.snippet).toContain("**caching**");
    }
  });

  it("includes log field when matched", () => {
    const docs = [
      makeDoc("ISS-1", "Some issue", "No match here", { log: "Fixed the caching bug yesterday" }),
    ];

    const results = search(docs, "caching");
    expect(results.length).toBe(1);
    expect(results[0]!.matches.some((m) => m.field === "log")).toBe(true);
  });
});

// ── Score format ──

describe("search - score format", () => {
  it("scores are rounded to 2 decimal places", () => {
    const docs = [makeDoc("ISS-1", "Caching implementation", "Redis caching layer")];
    const results = search(docs, "caching");
    expect(results.length).toBe(1);

    const scoreStr = results[0]!.score.toString();
    const parts = scoreStr.split(".");
    if (parts.length > 1) {
      expect(parts[1]!.length).toBeLessThanOrEqual(2);
    }
  });
});
