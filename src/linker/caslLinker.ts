import { createStructuredDiagnostic } from "../diagnostics/catalog";
import type { AssembledInstruction, Diagnostic, SourceMapEntry } from "../core/types";
import { assembleMockModule } from "../core/mockCaslCore";
import type {
  AppliedRelocation,
  LinkedProgramResult,
  LinkedSourceMapping,
  LinkedSymbol,
  LinkedWordOwnership,
  ModuleAssemblyResult,
  ModulePlacement,
  ProjectLinkRequest
} from "./types";

const LINK_BASE_ADDRESS = 0x20;
const MEMORY_WORD_COUNT = 0x10000;
export const MAX_PROJECT_MODULES = 64;

function linkerDiagnostic<C extends Extract<NonNullable<Diagnostic["code"]>, `linker.${string}`>>(
  code: C,
  params: NonNullable<Diagnostic<C>["params"]>,
  fallbackMessage: string,
  options: Pick<Diagnostic<C>, "line" | "sourceRange" | "relatedLocations" | "fileName"> = { line: 0 }
): Diagnostic<C> {
  return createStructuredDiagnostic(
    options.line,
    fallbackMessage,
    code,
    params,
    "error",
    {
      producer: "linker",
      sourceRange: options.sourceRange,
      relatedLocations: options.relatedLocations,
      fileName: options.fileName
    }
  );
}

function normalizedSymbol(value: string): string {
  return value.toUpperCase();
}

function failedResult(request: ProjectLinkRequest, diagnostics: readonly Diagnostic[]): LinkedProgramResult {
  return {
    ok: false,
    projectId: request.projectId,
    linkId: request.linkId,
    linkRevision: request.linkRevision,
    mainModuleId: request.mainModuleId,
    entryPoint: LINK_BASE_ADDRESS,
    moduleAssemblies: [],
    placements: [],
    words: [],
    wordOwnership: [],
    exportedSymbols: [],
    relocations: [],
    sourceMappings: [],
    instructions: [],
    diagnostics: [...diagnostics]
  };
}

export function linkCaslProject(request: ProjectLinkRequest): LinkedProgramResult {
  const diagnostics: Diagnostic[] = [];
  if (!request.projectId || !request.linkId) {
    diagnostics.push(linkerDiagnostic(
      "linker.invalidProjectIdentity",
      {},
      "Project and link identity are required"
    ));
  }
  if (request.modules.length === 0 || request.modules.length > MAX_PROJECT_MODULES) {
    diagnostics.push(linkerDiagnostic(
      "linker.invalidModuleOrder",
      { moduleCount: request.modules.length },
      "Project module count is outside the supported range"
    ));
  }
  const moduleIds = new Set<string>();
  for (const module of request.modules) {
    if (!module.moduleId || moduleIds.has(module.moduleId)) {
      diagnostics.push(linkerDiagnostic(
        "linker.invalidModuleOrder",
        { moduleId: module.moduleId },
        "Module order contains an empty or duplicate identity"
      ));
    }
    moduleIds.add(module.moduleId);
  }
  if (!request.mainModuleId || !moduleIds.has(request.mainModuleId)) {
    diagnostics.push(linkerDiagnostic(
      "linker.missingMainModule",
      request.mainModuleId ? { moduleId: request.mainModuleId } : {},
      "The selected main module is not present"
    ));
  } else if (request.modules[0]?.moduleId !== request.mainModuleId) {
    diagnostics.push(linkerDiagnostic(
      "linker.invalidModuleOrder",
      { moduleId: request.mainModuleId },
      "The main module must be first in module order"
    ));
  }
  if (diagnostics.length) return failedResult(request, diagnostics);

  const moduleAssemblies = request.modules.map(assembleMockModule);
  moduleAssemblies.forEach((assembly, index) => {
    const module = request.modules[index];
    if (!assembly.ok) {
      diagnostics.push(...assembly.diagnostics.map((diagnostic) => ({
        ...diagnostic,
        fileName: module.displayName
      })));
    }
    if (request.modules.length > 1 && !assembly.programName) {
      diagnostics.push(linkerDiagnostic(
        "linker.invalidProgramName",
        { moduleId: module.moduleId },
        "Each linked module requires a START program label",
        { line: 1, fileName: module.displayName }
      ));
    }
  });
  if (diagnostics.length) {
    return { ...failedResult(request, diagnostics), moduleAssemblies };
  }

  const placements: ModulePlacement[] = [];
  let nextAddress = LINK_BASE_ADDRESS;
  for (const assembly of moduleAssemblies) {
    const endAddressExclusive = nextAddress + assembly.moduleSize;
    if (endAddressExclusive > MEMORY_WORD_COUNT) {
      diagnostics.push(linkerDiagnostic(
        "linker.projectMemoryOverflow",
        { moduleId: assembly.moduleId, wordCount: assembly.moduleSize },
        "Linked program exceeds COMET II memory"
      ));
      break;
    }
    placements.push({
      moduleId: assembly.moduleId,
      baseAddress: nextAddress,
      wordCount: assembly.moduleSize,
      endAddressExclusive
    });
    nextAddress = endAddressExclusive;
  }
  if (diagnostics.length) {
    return { ...failedResult(request, diagnostics), moduleAssemblies, placements };
  }

  const placementByModule = new Map(placements.map((placement) => [placement.moduleId, placement]));
  const assemblyByModule = new Map(moduleAssemblies.map((assembly) => [assembly.moduleId, assembly]));
  const inputByModule = new Map(request.modules.map((module) => [module.moduleId, module]));
  const exportOwners = new Map<string, { assembly: ModuleAssemblyResult; symbol: ModuleAssemblyResult["exportedSymbols"][number] }>();
  for (const assembly of moduleAssemblies) {
    for (const symbol of assembly.exportedSymbols) {
      const existing = exportOwners.get(symbol.normalizedName);
      if (existing) {
        diagnostics.push(linkerDiagnostic(
          "linker.duplicateExportedProgram",
          { symbol: symbol.name },
          `Duplicate exported program symbol: ${symbol.name}`,
          {
            line: symbol.definitionRange.start.line,
            sourceRange: symbol.definitionRange,
            fileName: inputByModule.get(assembly.moduleId)?.displayName,
            relatedLocations: [{
              label: "diagnostic.firstDeclaredHere",
              sourceRange: existing.symbol.definitionRange,
              fileName: inputByModule.get(existing.assembly.moduleId)?.displayName
            }]
          }
        ));
      } else {
        exportOwners.set(symbol.normalizedName, { assembly, symbol });
      }
    }
  }
  if (diagnostics.length) {
    return { ...failedResult(request, diagnostics), moduleAssemblies, placements };
  }

  const words = moduleAssemblies.flatMap((assembly) => [...assembly.words]);
  const appliedRelocations: AppliedRelocation[] = [];
  const relocationTargets = new Set<number>();
  for (const assembly of moduleAssemblies) {
    const placement = placementByModule.get(assembly.moduleId)!;
    for (const relocation of assembly.relocations) {
      const linkedAddress = placement.baseAddress + relocation.wordOffset;
      const linkedWordIndex = linkedAddress - LINK_BASE_ADDRESS;
      if (
        linkedWordIndex < 0
        || linkedWordIndex >= words.length
        || relocationTargets.has(linkedAddress)
      ) {
        diagnostics.push(linkerDiagnostic(
          "linker.duplicateRelocationTarget",
          { address: linkedAddress },
          "Invalid or duplicate relocation target",
          {
            line: relocation.sourceRange.start.line,
            sourceRange: relocation.sourceRange,
            fileName: inputByModule.get(assembly.moduleId)?.displayName
          }
        ));
        continue;
      }
      relocationTargets.add(linkedAddress);

      const targetOwner = relocation.external
        ? exportOwners.get(relocation.normalizedSymbolName)
        : {
            assembly,
            symbol: assembly.localSymbols.find((symbol) =>
              symbol.normalizedName === relocation.normalizedSymbolName
            )
          };
      if (!targetOwner?.symbol) {
        diagnostics.push(linkerDiagnostic(
          "linker.unresolvedExternalSymbol",
          { symbol: relocation.symbolName },
          `Unresolved symbol: ${relocation.symbolName}`,
          {
            line: relocation.sourceRange.start.line,
            sourceRange: relocation.sourceRange,
            fileName: inputByModule.get(assembly.moduleId)?.displayName
          }
        ));
        continue;
      }

      const targetPlacement = placementByModule.get(targetOwner.assembly.moduleId)!;
      const resolvedAddress =
        targetPlacement.baseAddress + targetOwner.symbol.relativeAddress + relocation.addend;
      if (resolvedAddress < 0 || resolvedAddress > 0xffff) {
        diagnostics.push(linkerDiagnostic(
          "linker.relocationOverflow",
          { symbol: relocation.symbolName },
          "Relocation exceeds the 16-bit address range",
          {
            line: relocation.sourceRange.start.line,
            sourceRange: relocation.sourceRange,
            fileName: inputByModule.get(assembly.moduleId)?.displayName
          }
        ));
        continue;
      }
      words[linkedWordIndex] = resolvedAddress;
      appliedRelocations.push({
        relocationId: relocation.relocationId,
        moduleId: assembly.moduleId,
        kind: relocation.kind,
        linkedAddress,
        symbolName: relocation.symbolName,
        targetModuleId: targetOwner.assembly.moduleId,
        resolvedAddress
      });
    }
  }
  if (diagnostics.length) {
    return {
      ...failedResult(request, diagnostics),
      moduleAssemblies,
      placements,
      words: []
    };
  }

  const linkedSymbols: LinkedSymbol[] = [];
  const wordOwnership: LinkedWordOwnership[] = [];
  const sourceMappings: LinkedSourceMapping[] = [];
  const instructions: AssembledInstruction[] = [];
  for (const assembly of moduleAssemblies) {
    const placement = placementByModule.get(assembly.moduleId)!;
    for (const symbol of assembly.localSymbols) {
      if (symbol.scope === "module-exported") {
        linkedSymbols.push({
          moduleId: assembly.moduleId,
          name: symbol.name,
          normalizedName: normalizedSymbol(symbol.name),
          scope: symbol.scope,
          address: placement.baseAddress + symbol.relativeAddress
        });
      }
    }
    for (let offset = 0; offset < assembly.moduleSize; offset += 1) {
      wordOwnership.push({
        address: placement.baseAddress + offset,
        moduleId: assembly.moduleId,
        moduleRelativeOffset: offset,
        kind: assembly.wordKinds[offset] ?? "storage",
        sourceMappingId: assembly.sourceMappings.find((mapping) =>
          offset >= mapping.address && offset < mapping.address + mapping.machineWords.length
        )?.mappingId
      });
    }
    for (const mapping of assembly.sourceMappings) {
      const address = placement.baseAddress + mapping.address;
      sourceMappings.push({
        line: mapping.line,
        address,
        machineWords: mapping.machineWords.map((_word, offset) =>
          words[address - LINK_BASE_ADDRESS + offset] ?? 0
        ),
        source: mapping.source,
        label: mapping.label,
        instruction: mapping.instruction,
        mappingId: mapping.mappingId,
        moduleId: assembly.moduleId,
        sourceUnitId: assembly.sourceUnitId,
        moduleRelativeAddress: mapping.address
      });
    }
    for (const instruction of assembly.instructions) {
      const address = placement.baseAddress + instruction.address;
      instructions.push({
        ...instruction,
        address,
        operandAddress: instruction.size > 1
          ? words[address - LINK_BASE_ADDRESS + 1]
          : instruction.operandAddress,
        moduleId: assembly.moduleId,
        sourceUnitId: assembly.sourceUnitId,
        sourceMappingId: `${assembly.moduleId}:line:${instruction.line}:offset:${instruction.address}`
      });
    }
  }

  const mainAssembly = assemblyByModule.get(request.mainModuleId)!;
  const mainPlacement = placementByModule.get(request.mainModuleId)!;
  return {
    ok: true,
    projectId: request.projectId,
    linkId: request.linkId,
    linkRevision: request.linkRevision,
    mainModuleId: request.mainModuleId,
    entryPoint: mainPlacement.baseAddress + mainAssembly.entryOffset,
    moduleAssemblies,
    placements,
    words,
    wordOwnership,
    exportedSymbols: linkedSymbols,
    relocations: appliedRelocations,
    sourceMappings,
    instructions,
    diagnostics: []
  };
}

export function linkedSourceMapForModule(
  result: LinkedProgramResult,
  moduleId: string
): readonly SourceMapEntry[] {
  return result.sourceMappings.filter((mapping) => mapping.moduleId === moduleId);
}
