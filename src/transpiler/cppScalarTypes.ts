export type CppScalarType = "int" | "double";

export interface ScalarStorageLayout {
  readonly type: CppScalarType;
  readonly wordCount: 1 | 4;
  readonly wordBitRanges: readonly string[];
}

const INT_LAYOUT: ScalarStorageLayout = Object.freeze({
  type: "int",
  wordCount: 1,
  wordBitRanges: Object.freeze(["bits 15..0"])
});

const DOUBLE_LAYOUT: ScalarStorageLayout = Object.freeze({
  type: "double",
  wordCount: 4,
  wordBitRanges: Object.freeze(["bits 63..48", "bits 47..32", "bits 31..16", "bits 15..0"])
});

export function getScalarStorageLayout(type: CppScalarType): ScalarStorageLayout {
  return type === "double" ? DOUBLE_LAYOUT : INT_LAYOUT;
}

export function getScalarStorageWordCount(type: CppScalarType): 1 | 4 {
  return getScalarStorageLayout(type).wordCount;
}

export function isAssignmentCompatible(from: CppScalarType, to: CppScalarType): boolean {
  return from === to;
}

export function getScalarTypeDisplayName(type: CppScalarType): string {
  return type;
}
