import type { Diagnostic } from "../core/types";

export type CppTokenKind = "keyword" | "identifier" | "integer" | "symbol" | "eof";

export interface CppToken {
  kind: CppTokenKind;
  value: string;
  line: number;
  column: number;
  endLine: number;
  endColumn: number;
  startOffset: number;
  endOffset: number;
}

export interface LexResult {
  tokens: CppToken[];
  diagnostics: Diagnostic[];
}

const keywords = new Set(["int", "return", "if", "else", "while", "for", "break", "continue"]);
const symbols = new Set(["(", ")", "{", "}", ";", "=", "+", "-", "*", ",", "!", "<", ">"]);

export function lexCpp(source: string): LexResult {
  const tokens: CppToken[] = [];
  const diagnostics: Diagnostic[] = [];
  let index = 0;
  let line = 1;
  let column = 1;

  const peek = (offset = 0) => source[index + offset] ?? "";
  const advance = () => {
    const ch = source[index] ?? "";
    index += 1;
    if (ch === "\n") {
      line += 1;
      column = 1;
    } else {
      column += 1;
    }
    return ch;
  };

  const push = (kind: CppTokenKind, value: string, tokenLine: number, tokenColumn: number, startOffset: number) => {
    tokens.push({ kind, value, line: tokenLine, column: tokenColumn, endLine: line, endColumn: column, startOffset, endOffset: index });
  };

  while (index < source.length) {
    const ch = peek();

    if (/\s/.test(ch)) {
      advance();
      continue;
    }

    if (ch === "/" && peek(1) === "/") {
      while (index < source.length && peek() !== "\n") advance();
      continue;
    }

    if (ch === "/" && peek(1) === "*") {
      const startLine = line;
      const startColumn = column;
      const startOffset = index;
      advance();
      advance();
      while (index < source.length && !(peek() === "*" && peek(1) === "/")) advance();
      if (index >= source.length) {
        diagnostics.push({
          line: startLine,
          message: "Unterminated block comment.",
          severity: "error",
          sourceRange: {
            start: { line: startLine, column: startColumn, offset: startOffset },
            end: { line, column, offset: index }
          }
        });
        break;
      }
      advance();
      advance();
      continue;
    }

    if (/[A-Za-z_]/.test(ch)) {
      const startLine = line;
      const startColumn = column;
      const startOffset = index;
      let value = "";
      while (/[A-Za-z0-9_]/.test(peek())) value += advance();
      push(keywords.has(value) ? "keyword" : "identifier", value, startLine, startColumn, startOffset);
      continue;
    }

    if (/[0-9]/.test(ch)) {
      const startLine = line;
      const startColumn = column;
      const startOffset = index;
      let value = "";
      while (/[0-9]/.test(peek())) value += advance();
      push("integer", value, startLine, startColumn, startOffset);
      continue;
    }

    const twoChar = `${ch}${peek(1)}`;
    if (twoChar === "==" || twoChar === "!=" || twoChar === "<=" || twoChar === ">=" || twoChar === "++" || twoChar === "--" || twoChar === "+=" || twoChar === "-=") {
      const startLine = line;
      const startColumn = column;
      const startOffset = index;
      advance();
      advance();
      push("symbol", twoChar, startLine, startColumn, startOffset);
      continue;
    }

    if (symbols.has(ch)) {
      const startLine = line;
      const startColumn = column;
      const startOffset = index;
      advance();
      push("symbol", ch, startLine, startColumn, startOffset);
      continue;
    }

    const startLine = line;
    const startColumn = column;
    const startOffset = index;
    advance();
    diagnostics.push({
      line: startLine,
      message: `Unsupported character '${ch}' in C++ subset source.`,
      severity: "error",
      sourceRange: {
        start: { line: startLine, column: startColumn, offset: startOffset },
        end: { line, column, offset: index }
      }
    });
  }

  tokens.push({ kind: "eof", value: "", line, column, endLine: line, endColumn: column, startOffset: index, endOffset: index });
  return { tokens, diagnostics };
}
