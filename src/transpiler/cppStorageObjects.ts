import type { CometState } from "../core/types";
import type { CppStorageObject, CppStorageWord, CppToCaslMap } from "./cppAst";

export interface ResolvedCppStorageWord extends CppStorageWord {
  address?: number;
}

export interface ResolvedCppStorageObject extends Omit<CppStorageObject, "words"> {
  baseAddress?: number;
  words: readonly ResolvedCppStorageWord[];
}

export interface DoubleOperationContext {
  operationId: string;
  kind: "double-initializer" | "double-literal-assignment" | "double-copy";
  wordIndex: number;
  currentObject?: ResolvedCppStorageObject;
  sourceObject?: ResolvedCppStorageObject;
  destinationObject?: ResolvedCppStorageObject;
}

export function resolveCppStorageObjects(
  objects: readonly CppStorageObject[],
  state: Pick<CometState, "symbols">
): ResolvedCppStorageObject[] {
  return objects.map((object) => {
    const words = object.words.map((word) => ({
      ...word,
      address: state.symbols[word.label.toUpperCase()]
    }));
    return {
      ...object,
      baseAddress: words[0]?.address,
      words
    };
  });
}

export function findStorageObjectForAddress(
  objects: readonly ResolvedCppStorageObject[],
  address: number
): { object: ResolvedCppStorageObject; word: ResolvedCppStorageWord } | undefined {
  for (const object of objects) {
    const word = object.words.find((candidate) => candidate.address === address);
    if (word) return { object, word };
  }
  return undefined;
}

export function doubleOperationForCaslLine(
  mapping: readonly CppToCaslMap[],
  objects: readonly ResolvedCppStorageObject[],
  caslLine: number | undefined
): DoubleOperationContext | undefined {
  if (caslLine === undefined) return undefined;
  const current = mapping.find((entry) =>
    entry.caslLines.includes(caslLine)
    && entry.operationId
    && entry.wordIndex !== undefined
    && entry.kind.startsWith("double-")
  );
  if (!current?.operationId || current.wordIndex === undefined) return undefined;
  const operation = mapping.filter((entry) => entry.operationId === current.operationId);
  const objectById = new Map(objects.map((object) => [object.objectId, object]));
  const sourceId = operation.find((entry) => entry.kind === "double-copy-read")?.objectId;
  const destinationId = operation.find((entry) => entry.kind === "double-copy-write")?.objectId;
  const kind = current.kind === "double-initializer"
    ? "double-initializer"
    : current.kind === "double-literal-assignment"
      ? "double-literal-assignment"
      : "double-copy";
  return {
    operationId: current.operationId,
    kind,
    wordIndex: current.wordIndex,
    currentObject: current.objectId ? objectById.get(current.objectId) : undefined,
    sourceObject: sourceId ? objectById.get(sourceId) : undefined,
    destinationObject: destinationId ? objectById.get(destinationId) : undefined
  };
}
