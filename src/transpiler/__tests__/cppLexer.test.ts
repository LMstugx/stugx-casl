import { describe, expect, it } from "vitest";
import { lexCpp } from "../cppLexer";

describe("C++ subset lexer", () => {
  it("lexer_var_decl", () => {
    const result = lexCpp("int a = 10;");

    expect(result.diagnostics).toEqual([]);
    expect(result.tokens.map((token) => [token.kind, token.value])).toEqual([
      ["keyword", "int"],
      ["identifier", "a"],
      ["symbol", "="],
      ["integer", "10"],
      ["symbol", ";"],
      ["eof", ""]
    ]);
  });

  it("lexes if comparison operators", () => {
    const result = lexCpp("if (a == b) { c = 1; } else { c = 0; }");

    expect(result.diagnostics).toEqual([]);
    expect(result.tokens.map((token) => token.value)).toEqual(["if", "(", "a", "==", "b", ")", "{", "c", "=", "1", ";", "}", "else", "{", "c", "=", "0", ";", "}", ""]);
  });

  it("lexes while keyword", () => {
    const result = lexCpp("while (i > 0) { i = i - 1; }");

    expect(result.diagnostics).toEqual([]);
    expect(result.tokens.map((token) => token.value)).toContain("while");
    expect(result.tokens[0]).toMatchObject({ kind: "keyword", value: "while" });
  });
});
