import { generateCaslFromCpp } from "./cppToCasl";
import { parseCpp } from "./cppParser";
import { checkCppSemantics } from "./cppSemantic";
import { createStructuredDiagnostic } from "../diagnostics/catalog";
import type { TranspileResult } from "./cppAst";

export function transpileCppToCasl(source: string): TranspileResult {
  const parsed = parseCpp(source);
  const semantic = checkCppSemantics(parsed.program, parsed.diagnostics, source);
  if (!parsed.program || !semantic.ok) {
    return {
      ok: false,
      caslSource: "",
      diagnostics: semantic.diagnostics,
      mapping: [],
      storageObjects: []
    };
  }

  try {
    const generated = generateCaslFromCpp(parsed.program, semantic.variables);
    return {
      ok: true,
      caslSource: generated.caslSource,
      diagnostics: [],
      mapping: generated.mapping,
      storageObjects: generated.storageObjects
    };
  } catch (error) {
    const rawContext = error instanceof Error ? error.message : String(error);
    return {
      ok: false,
      caslSource: "",
      diagnostics: [createStructuredDiagnostic(0, rawContext, "transpiler.internalLoweringFailure", {}, "error", {
        producer: "transpiler",
        rawContext
      })],
      mapping: [],
      storageObjects: []
    };
  }
}

export type { CppStorageObject, CppToCaslMap, TranspileResult } from "./cppAst";
