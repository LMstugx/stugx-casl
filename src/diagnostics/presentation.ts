const maximumDeveloperDetailLength = 1600;

export function formatDiagnosticDeveloperDetail(value: unknown): string | undefined {
  const raw = safeStringify(value);
  if (!raw) return undefined;
  const withoutStackFrames = raw
    .split(/\r?\n/)
    .filter((line) => !/^\s*at(?:\s+async)?\s+/i.test(line))
    .join("\n");
  const redacted = withoutStackFrames
    .replace(/\b[A-Za-z]:\\[^\s"'<>]+/g, "[local path]")
    .replace(/\bfile:\/\/\/[^\s"'<>]+/gi, "[local path]")
    .replace(/\/(?:Users|home|tmp)\/[^\s"'<>]+/g, "[local path]")
    .trim();
  if (!redacted) return undefined;
  return redacted.length > maximumDeveloperDetailLength
    ? `${redacted.slice(0, maximumDeveloperDetailLength)}...`
    : redacted;
}

function safeStringify(value: unknown): string {
  if (typeof value === "string") return value;
  if (value instanceof Error) return value.message;
  if (value === undefined || value === null) return "";
  try {
    const seen = new WeakSet<object>();
    return JSON.stringify(value, (_key, entry) => {
      if (typeof entry !== "object" || entry === null) return entry;
      if (seen.has(entry)) return "[Circular]";
      seen.add(entry);
      return entry;
    });
  } catch {
    try {
      return String(value);
    } catch {
      return "";
    }
  }
}
