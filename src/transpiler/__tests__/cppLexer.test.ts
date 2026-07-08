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
});
