import type { ErrorEnvelope, SuccessEnvelope } from "./types.ts";
import { MdpError } from "./errors.ts";

let quiet = false;
let verbose = false;
let outputFormat: "json" | "table" = "json";

export function setQuiet(q: boolean): void {
  quiet = q;
}

export function setVerbose(v: boolean): void {
  verbose = v;
}

export function isVerbose(): boolean {
  return verbose;
}

export function setFormat(fmt: "json" | "table"): void {
  outputFormat = fmt;
}

export function getFormat(): "json" | "table" {
  return outputFormat;
}

export function success<T>(data: T, warnings: string[] = []): SuccessEnvelope<T> {
  const envelope: SuccessEnvelope<T> = { ok: true, data };
  if (warnings.length > 0) {
    envelope.warnings = warnings;
  }
  return envelope;
}

export function errorEnvelope(code: string, message: string, details: Record<string, unknown> = {}): ErrorEnvelope {
  return {
    ok: false,
    error: { code, message, details },
  };
}

export function printSuccess<T>(data: T, warnings: string[] = []): void {
  if (quiet) return;
  const envelope = success(data, warnings);
  process.stdout.write(JSON.stringify(envelope, null, 2) + "\n");
}

export function printError(err: unknown): void {
  if (quiet) return;
  if (err instanceof MdpError) {
    const envelope = errorEnvelope(err.code, err.message, err.details);
    process.stderr.write(JSON.stringify(envelope, null, 2) + "\n");
  } else if (err instanceof Error) {
    const envelope = errorEnvelope("UNKNOWN_ERROR", err.message);
    process.stderr.write(JSON.stringify(envelope, null, 2) + "\n");
  } else {
    const envelope = errorEnvelope("UNKNOWN_ERROR", String(err));
    process.stderr.write(JSON.stringify(envelope, null, 2) + "\n");
  }
}

export function printTable(text: string): void {
  if (quiet) return;
  process.stdout.write(text + "\n");
}

export function verboseLog(message: string): void {
  if (!verbose) return;
  process.stderr.write(`[verbose] ${message}\n`);
}
