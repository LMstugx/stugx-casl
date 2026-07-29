import type { Diagnostic, AssembledInstruction, SourceMapEntry } from "../core/types";
import type { SourceRange } from "../diagnostics/types";
import type { DocumentWriteBinding, SourceDocument, SourceUnitId } from "../documents/types";

declare const projectIdBrand: unique symbol;
declare const moduleIdBrand: unique symbol;
declare const moduleAssemblyIdBrand: unique symbol;
declare const linkIdBrand: unique symbol;

export type ProjectId = string & { readonly [projectIdBrand]: "ProjectId" };
export type ModuleId = string & { readonly [moduleIdBrand]: "ModuleId" };
export type ModuleAssemblyId = string & { readonly [moduleAssemblyIdBrand]: "ModuleAssemblyId" };
export type LinkId = string & { readonly [linkIdBrand]: "LinkId" };
export type LinkRevision = number;

export type SymbolScope = "module-local" | "module-exported" | "generated-private";
export type ModuleSymbolKind = "program" | "label" | "data" | "literal" | "generated";
export type RelocationKind = "absolute-address-word" | "call-target" | "data-address-constant";
export type LinkedWordKind = "instruction" | "operand" | "data" | "storage" | "literal";

export interface ModuleSymbol {
  symbolId: string;
  moduleId: ModuleId;
  name: string;
  normalizedName: string;
  scope: SymbolScope;
  relativeAddress: number;
  definitionRange: SourceRange;
  kind: ModuleSymbolKind;
}

export interface ExportedSymbol extends ModuleSymbol {
  scope: "module-exported";
}

export interface RelocationRecord {
  relocationId: string;
  moduleId: ModuleId;
  moduleAssemblyId: ModuleAssemblyId;
  wordOffset: number;
  kind: RelocationKind;
  symbolName: string;
  normalizedSymbolName: string;
  addend: number;
  sourceRange: SourceRange;
  instructionIdentity?: string;
  external: boolean;
}

export interface ModuleSourceMapping extends SourceMapEntry {
  mappingId: string;
  moduleId: ModuleId;
  sourceUnitId: SourceUnitId;
}

export interface ModuleAssemblyResult {
  ok: boolean;
  moduleId: ModuleId;
  sourceUnitId: SourceUnitId;
  moduleAssemblyId: ModuleAssemblyId;
  programName: string;
  requestedEntrySymbol?: string;
  localSymbols: readonly ModuleSymbol[];
  exportedSymbols: readonly ExportedSymbol[];
  unresolvedReferences: readonly RelocationRecord[];
  relocations: readonly RelocationRecord[];
  words: readonly number[];
  wordKinds: readonly LinkedWordKind[];
  instructions: readonly AssembledInstruction[];
  sourceMappings: readonly ModuleSourceMapping[];
  moduleSize: number;
  entryOffset: number;
  diagnostics: readonly Diagnostic[];
}

export interface CaslModuleDocument {
  moduleId: ModuleId;
  sourceUnitId: SourceUnitId;
  displayName: string;
  document: SourceDocument;
  writeBinding: DocumentWriteBinding | null;
  assembly?: ModuleAssemblyResult;
}

export type ProjectLinkState =
  | { status: "unlinked" }
  | { status: "stale"; reason: LinkStaleReason; previous?: LinkedProgramResult }
  | { status: "linking"; requestId: string; previous?: LinkedProgramResult }
  | { status: "linked"; result: LinkedProgramResult }
  | { status: "error"; diagnostics: readonly Diagnostic[]; previous?: LinkedProgramResult };

export type LinkStaleReason =
  | "module-added"
  | "module-removed"
  | "module-reordered"
  | "main-changed"
  | "source-replaced"
  | "source-edited"
  | "module-assembled";

export interface CaslProjectSession {
  projectId: ProjectId;
  modules: readonly CaslModuleDocument[];
  activeModuleId: ModuleId;
  mainModuleId: ModuleId | null;
  moduleOrder: readonly ModuleId[];
  linkState: ProjectLinkState;
  linkRevision: LinkRevision;
}

export interface ProjectLinkModuleInput {
  moduleId: ModuleId;
  sourceUnitId: SourceUnitId;
  moduleAssemblyId: ModuleAssemblyId;
  displayName: string;
  source: string;
}

export interface ProjectLinkRequest {
  projectId: ProjectId;
  linkId: LinkId;
  linkRevision: LinkRevision;
  mainModuleId: ModuleId;
  modules: readonly ProjectLinkModuleInput[];
}

export interface ModulePlacement {
  moduleId: ModuleId;
  baseAddress: number;
  wordCount: number;
  endAddressExclusive: number;
}

export interface LinkedSymbol {
  moduleId: ModuleId;
  name: string;
  normalizedName: string;
  scope: "module-exported";
  address: number;
}

export interface AppliedRelocation {
  relocationId: string;
  moduleId: ModuleId;
  kind: RelocationKind;
  linkedAddress: number;
  symbolName: string;
  targetModuleId: ModuleId;
  resolvedAddress: number;
}

export interface LinkedWordOwnership {
  address: number;
  moduleId: ModuleId;
  moduleRelativeOffset: number;
  kind: LinkedWordKind;
  sourceMappingId?: string;
}

export interface LinkedSourceMapping extends SourceMapEntry {
  mappingId: string;
  moduleId: ModuleId;
  sourceUnitId: SourceUnitId;
  moduleRelativeAddress: number;
}

export interface LinkedProgramResult {
  ok: boolean;
  projectId: ProjectId;
  linkId: LinkId;
  linkRevision: LinkRevision;
  mainModuleId: ModuleId;
  entryPoint: number;
  moduleAssemblies: readonly ModuleAssemblyResult[];
  placements: readonly ModulePlacement[];
  words: readonly number[];
  wordOwnership: readonly LinkedWordOwnership[];
  exportedSymbols: readonly LinkedSymbol[];
  relocations: readonly AppliedRelocation[];
  sourceMappings: readonly LinkedSourceMapping[];
  instructions: readonly AssembledInstruction[];
  diagnostics: readonly Diagnostic[];
}

export interface LinkProjectResultDto {
  ok: boolean;
  link: LinkedProgramResult;
  state: import("../core/coreDto").CometStateDto;
  diagnostics: import("../core/coreDto").DiagnosticDto[];
}
