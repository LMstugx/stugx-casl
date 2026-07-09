import { describe, expect, it } from "vitest";
import { transpileCppToCasl } from "../cppTranspiler";

const malformedCorpus = [
  ["empty source", ""],
  ["only whitespace", "   \n\t  "],
  ["only comments", "// comment\n/* block */"],
  ["bare int", "int"],
  ["open main parameters", "int main("],
  ["main declaration without body", "int main()"],
  ["open main body", "int main() {"],
  ["unterminated declaration", "int main() { int"],
  ["unterminated initializer", "int main() { int x ="],
  ["open if condition", "int main() { if ("],
  ["open while condition", "int main() { while ("],
  ["open for header", "int main() { for ("],
  ["for without condition", "int main() { for (;;) { } }"],
  ["break outside loop", "int main() { break; }"],
  ["continue outside loop", "int main() { continue; }"],
  ["trailing call comma", "int main() { return foo(1,); }"],
  ["leading call comma", "int main() { return foo(,1); }"],
  ["array declaration", "int main() { int x[10]; }"],
  ["pointer declaration", "int main() { int* p; }"],
  ["broken parentheses", "int main() { x = (((; }"],
  ["duplicate braces", "int main() { return 0; }} }"],
  ["missing braces in nested blocks", "int main() { if (1 == 1) { while ("],
  ["very long identifier", `int main() { int ${"x".repeat(512)} = 1; return ${"x".repeat(512)}; }`],
  ["repeated invalid tokens", `int main() { ${"@ ".repeat(64)} return 0; }`],
  ["malformed function declaration sequence", "float bad() { return 0; }\nint main() { return 0; }"],
  ["nested broken control blocks", "int main() { if (1 == 1) { while (1 > 0) { for (int i = 0; i < ; i++) { return i; } } }"]
] as const;

describe("C++ parser fuzz-style malformed corpus", () => {
  it.each(malformedCorpus)("cpp_parser_fuzz_corpus_%s", (_name, source) => {
    const start = performance.now();
    const result = transpileCppToCasl(source);
    const elapsedMs = performance.now() - start;

    expect(elapsedMs).toBeLessThan(250);
    if (!result.ok) {
      expect(result.diagnostics.length).toBeGreaterThan(0);
      expect(result.diagnostics.map((diagnostic) => diagnostic.message).join("\n").trim()).not.toBe("");
    } else {
      expect(result.caslSource).toContain("MAIN START");
    }
  });
});
