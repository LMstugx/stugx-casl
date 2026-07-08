# Phase 5B C++ Subset Transpiler MVP

Phase 5B adds a TypeScript-side C++ subset transpiler. It does not change CASL VM semantics, C++ Core behavior, CoreAdapter, or the WASM bridge. The generated CASL continues through the existing `coreBridge`, so both Mock and WASM backends can execute it.

## Supported C++ Subset

Function:

- exactly `int main() { ... }`

Type:

- `int`

Statements:

- `int a = 10;`
- `int b;`
- `a = 10;`
- `c = a + b;`
- `c = a - b;`
- `if (a == b) { ... }` is added in Phase 5C
- `if (a == b) { ... } else { ... }` is added in Phase 5C
- `return c;`
- `return 0;`

Expressions:

- integer literal
- identifier
- binary `+`
- binary `-`

## Unsupported C++ Features

The MVP intentionally rejects:

- full C++
- `class` / `struct`
- pointers and references
- templates
- arrays
- functions other than `main`
- function calls
- `std::cout`, `iostream`, `std::vector`
- `float`, `double`, `char`, `string`
- `while` / `for`
- complex boolean expressions
- complex scope rules

Unsupported syntax returns diagnostics instead of crashing.

## Pipeline

```text
C++ subset source
-> lexer
-> parser
-> AST
-> semantic check
-> CASL generator
-> existing CASL assembler
-> COMET VM
-> SVG circuit visualization
```

Implementation files:

- `src/transpiler/cppLexer.ts`
- `src/transpiler/cppParser.ts`
- `src/transpiler/cppAst.ts`
- `src/transpiler/cppSemantic.ts`
- `src/transpiler/cppToCasl.ts`
- `src/transpiler/cppTranspiler.ts`

## AST Shape

The MVP AST includes:

- `CppProgram`
- `CppFunction`
- `CppStatement`
- `CppVarDecl`
- `CppAssignment`
- `CppReturn`
- `CppExpression`
- `CppBinaryExpression`
- `CppIdentifier`
- `CppIntegerLiteral`

## Semantic Checks

The semantic pass checks:

- source must contain `int main()`
- variable declarations must appear before use
- duplicate variable declarations are errors
- assignment targets must be declared identifiers
- only `int` is supported
- integer literals must fit signed 16-bit range
- unsupported syntax returns diagnostics

## CASL Generation Rules

Variables are statically allocated in the CASL data area:

```cpp
int a = 10;
int c;
```

becomes:

```text
A DC    10
C DS    1
```

Assignments use `GR1` as the temporary calculation register:

```cpp
c = a + b;
```

becomes:

```text
     LD    GR1,A
     ADDA  GR1,B
     ST    GR1,C
```

Subtraction:

```cpp
c = a - b;
```

becomes:

```text
     LD    GR1,A
     SUBA  GR1,B
     ST    GR1,C
```

Literal assignment:

```cpp
a = 10;
```

becomes:

```text
     LAD   GR1,10
     ST    GR1,A
```

## Return Value Rule

`GR0` is the return-value register:

```cpp
return c;
```

becomes:

```text
     LD    GR0,C
     RET
```

`return 0;` becomes:

```text
     LAD   GR0,0
     RET
```

## Variable Labels

Local variables become static CASL labels. Labels are uppercased and sanitized. Reserved names are prefixed, for example `main` becomes `VAR_MAIN`.

The MVP does not implement stack frames or register allocation.

## C++ To CASL Mapping

`transpileCppToCasl(source)` returns `mapping: CppToCaslMap[]`:

```ts
type CppToCaslMap = {
  cppLine: number;
  caslLines: number[];
  reason: string;
  kind: "declaration" | "assignment" | "return" | "if-condition" | "if-then" | "if-else" | "generated-label" | "constant";
};
```

The UI stores this mapping. Phase 5C uses it to project the current generated CASL row back to the C++ editor and to highlight the active generated CASL range.

## UI Integration

The source panel has a `CASL` / `C++ subset` mode switch.

In C++ subset mode:

1. Assemble runs `transpileCppToCasl(sourceText)`.
2. If transpilation fails, diagnostics are shown and Step remains disabled.
3. If transpilation succeeds, generated CASL is shown in the Output dock.
4. Generated CASL is sent to `coreBridge.assemble`.
5. Mock and WASM backends remain interchangeable.

## Current Limits

- No `while` / `for` yet.
- No `else if` yet.
- No complex boolean expressions.
- No stack frame.
- No arrays.
- No function calls.
- No complete C++ grammar.
- Generated CASL is intentionally straightforward and not optimized.

## Phase 5C Follow-Up

Phase 5C adds:

- `if` / `else` lowering using `CPA`, `JZE`, `JNZ`, `JPL`, and `JMI`.
- C++ line to CASL line dual highlighting.

`while` lowering remains a future phase.
