import { generateCaslFromCpp } from "./cppToCasl";
import { parseCpp } from "./cppParser";
import { checkCppSemantics } from "./cppSemantic";
import type { TranspileResult } from "./cppAst";

export function transpileCppToCasl(source: string): TranspileResult {
  const parsed = parseCpp(source);
  const semantic = checkCppSemantics(parsed.program, parsed.diagnostics);
  if (!parsed.program || !semantic.ok) {
    return {
      ok: false,
      caslSource: "",
      diagnostics: semantic.diagnostics,
      mapping: []
    };
  }

  try {
    const generated = generateCaslFromCpp(parsed.program, semantic.variables);
    return {
      ok: true,
      caslSource: generated.caslSource,
      diagnostics: [],
      mapping: generated.mapping
    };
  } catch (error) {
    return {
      ok: false,
      caslSource: "",
      diagnostics: [{ line: 0, message: error instanceof Error ? error.message : String(error), severity: "error" }],
      mapping: []
    };
  }
}

export type { CppToCaslMap, TranspileResult } from "./cppAst";
