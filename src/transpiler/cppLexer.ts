import type { Diagnostic } from "../core/types";
import { createStructuredDiagnostic } from "../diagnostics/catalog";

export type CppTokenKind = "keyword" | "identifier" | "integer" | "floating" | "symbol" | "eof";

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

const keywords = new Set(["int", "double", "return", "if", "else", "while", "for", "break", "continue"]);
const symbols = new Set(["(", ")", "{", "}", "[", "]", ";", "=", "+", "-", "*", "/", ",", "!", "<", ">"]);

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
        diagnostics.push(createStructuredDiagnostic(startLine, "Unterminated block comment.", "cppParser.unterminatedBlock", {
          construct: "block comment"
        }, "error", {
          producer: "cpp-lexer",
          sourceRange: {
            start: { line, column, offset: index },
            end: { line, column, offset: index }
          },
          relatedLocations: [{
            label: "diagnostic.openingDelimiterHere",
            sourceRange: {
              start: { line: startLine, column: startColumn, offset: startOffset },
              end: { line: startLine, column: startColumn + 2, offset: startOffset + 2 }
            }
          }]
        }));
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
      let floating = false;
      if (value === "0" && /[xX]/.test(peek())) {
        floating = true;
        value += advance();
        while (/[A-Za-z0-9_.+-]/.test(peek())) value += advance();
      } else {
        if (peek() === ".") {
          floating = true;
          value += advance();
          while (/[0-9]/.test(peek())) value += advance();
        }
        if (/[eE]/.test(peek())) {
          floating = true;
          value += advance();
          if (peek() === "+" || peek() === "-") value += advance();
          while (/[0-9]/.test(peek())) value += advance();
        }
        if (/[A-Za-z_]/.test(peek())) {
          floating = true;
          while (/[A-Za-z0-9_]/.test(peek())) value += advance();
        }
      }
      push(floating ? "floating" : "integer", value, startLine, startColumn, startOffset);
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
    diagnostics.push(createStructuredDiagnostic(startLine, `Unsupported character '${ch}' in C++ subset source.`, "cppParser.unexpectedToken", {
      token: ch
    }, "error", {
      producer: "cpp-lexer",
      sourceRange: {
        start: { line: startLine, column: startColumn, offset: startOffset },
        end: { line, column, offset: index }
      }
    }));
  }

  tokens.push({ kind: "eof", value: "", line, column, endLine: line, endColumn: column, startOffset: index, endOffset: index });
  return { tokens, diagnostics };
}
