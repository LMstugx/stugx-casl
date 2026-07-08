import type { CppToCaslMap } from "./cppAst";

export function cppLineForCaslLine(mapping: CppToCaslMap[], caslLine?: number): number | undefined {
  if (!caslLine) return undefined;
  return mapping.find((entry) => entry.caslLines.includes(caslLine))?.cppLine;
}

export function caslLinesForCppLine(mapping: CppToCaslMap[], cppLine?: number): Set<number> {
  if (!cppLine) return new Set();
  return new Set(mapping.filter((entry) => entry.cppLine === cppLine).flatMap((entry) => entry.caslLines));
}

export function mappingKindsForCaslLine(mapping: CppToCaslMap[], caslLine: number): Set<CppToCaslMap["kind"]> {
  return new Set(mapping.filter((entry) => entry.caslLines.includes(caslLine)).map((entry) => entry.kind));
}
