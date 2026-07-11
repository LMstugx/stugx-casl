import type { SourcePosition, SourceRange } from "./types";

export function sourcePositionAtOffset(source: string, requestedOffset: number): SourcePosition {
  const offset = Math.max(0, Math.min(source.length, Math.trunc(requestedOffset)));
  let line = 1;
  let lineStart = 0;
  for (let index = 0; index < offset; index += 1) {
    if (source[index] === "\n") {
      line += 1;
      lineStart = index + 1;
    }
  }
  return { line, column: offset - lineStart + 1, offset };
}

export function sourceRangeFromOffsets(source: string, startOffset: number, endOffset: number): SourceRange {
  const start = Math.max(0, Math.min(source.length, Math.trunc(startOffset)));
  const end = Math.max(start, Math.min(source.length, Math.trunc(endOffset)));
  return { start: sourcePositionAtOffset(source, start), end: sourcePositionAtOffset(source, end) };
}

export function eofInsertionRange(source: string): SourceRange {
  return sourceRangeFromOffsets(source, source.length, source.length);
}

export function rangeForTextOnLine(source: string, line: number, text: string, occurrence = 0): SourceRange | undefined {
  if (!text || line < 1) return undefined;
  const lines = lineSlices(source);
  const slice = lines[line - 1];
  if (!slice) return undefined;
  let from = 0;
  let found = -1;
  for (let index = 0; index <= occurrence; index += 1) {
    found = slice.text.indexOf(text, from);
    if (found < 0) return undefined;
    from = found + text.length;
  }
  return sourceRangeFromOffsets(source, slice.offset + found, slice.offset + found + text.length);
}

export function rangeForLastTextOnLine(source: string, line: number, text: string): SourceRange | undefined {
  if (!text || line < 1) return undefined;
  const slice = lineSlices(source)[line - 1];
  if (!slice) return undefined;
  const found = slice.text.lastIndexOf(text);
  return found < 0 ? undefined : sourceRangeFromOffsets(source, slice.offset + found, slice.offset + found + text.length);
}

export function firstMeaningfulInsertionRange(source: string): SourceRange {
  const slices = lineSlices(source);
  for (const slice of slices) {
    const first = slice.text.search(/\S/);
    if (first >= 0 && slice.text[first] !== ";") return sourceRangeFromOffsets(source, slice.offset + first, slice.offset + first);
  }
  return sourceRangeFromOffsets(source, 0, 0);
}

export function isValidSourceRange(range: unknown, source?: string): range is SourceRange {
  if (!isPosition((range as SourceRange | undefined)?.start) || !isPosition((range as SourceRange | undefined)?.end)) return false;
  const typed = range as SourceRange;
  if (compareLineColumns(typed.start, typed.end) > 0) return false;
  if (typed.start.offset !== undefined && typed.end.offset !== undefined) {
    if (typed.start.offset > typed.end.offset) return false;
    if (source !== undefined && typed.end.offset > source.length) return false;
  }
  return true;
}

function isPosition(value: unknown): value is SourcePosition {
  if (!value || typeof value !== "object") return false;
  const position = value as SourcePosition;
  return Number.isInteger(position.line) && position.line >= 1 && Number.isInteger(position.column) && position.column >= 1 &&
    (position.offset === undefined || (Number.isInteger(position.offset) && position.offset >= 0));
}

function compareLineColumns(left: SourcePosition, right: SourcePosition): number {
  return left.line === right.line ? left.column - right.column : left.line - right.line;
}

function lineSlices(source: string): Array<{ text: string; offset: number }> {
  const result: Array<{ text: string; offset: number }> = [];
  let offset = 0;
  for (const raw of source.split("\n")) {
    const text = raw.endsWith("\r") ? raw.slice(0, -1) : raw;
    result.push({ text, offset });
    offset += raw.length + 1;
  }
  return result;
}
