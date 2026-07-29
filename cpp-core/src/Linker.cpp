#include "Linker.hpp"

#include <algorithm>
#include <cctype>
#include <limits>
#include <unordered_map>
#include <unordered_set>

namespace casl {
namespace {

constexpr std::size_t kMaximumModules = 64;

std::string normalizedSymbol(std::string value) {
    std::transform(value.begin(), value.end(), value.begin(), [](unsigned char ch) {
        return static_cast<char>(std::toupper(ch));
    });
    return value;
}

Diagnostic linkDiagnostic(
    std::string code,
    std::string fallback,
    std::unordered_map<std::string, DiagnosticParamValue> params = {},
    int line = 0,
    std::optional<SourceRange> range = std::nullopt,
    std::string fileName = {}
) {
    Diagnostic diagnostic;
    diagnostic.line = line;
    diagnostic.severity = Severity::Error;
    diagnostic.message = fallback;
    diagnostic.code = std::move(code);
    diagnostic.producer = "linker";
    diagnostic.params = std::move(params);
    diagnostic.fallbackMessage = std::move(fallback);
    diagnostic.sourceRange = std::move(range);
    diagnostic.fileName = std::move(fileName);
    return diagnostic;
}

const ModuleSymbol* findModuleSymbol(const ModuleAssemblyOutput& module, const std::string& normalizedName) {
    const auto found = std::find_if(module.symbols.begin(), module.symbols.end(), [&](const ModuleSymbol& symbol) {
        return symbol.normalizedName == normalizedName;
    });
    return found == module.symbols.end() ? nullptr : &*found;
}

const SourceMapEntry* sourceMappingForOffset(const ModuleAssemblyOutput& module, std::uint32_t offset) {
    for (const auto& mapping : module.sourceMap.entries()) {
        const auto start = static_cast<std::uint32_t>(mapping.address);
        const auto end = start + static_cast<std::uint32_t>(mapping.machineWords.size());
        if (offset >= start && offset < end) return &mapping;
    }
    return nullptr;
}

LinkedWordKind wordKindForOffset(const ModuleAssemblyOutput& module, std::uint32_t offset) {
    const auto* mapping = sourceMappingForOffset(module, offset);
    if (!mapping) return LinkedWordKind::Storage;
    if (mapping->instruction == Opcode::DS) return LinkedWordKind::Storage;
    if (mapping->instruction == Opcode::DC) {
        const auto generated = std::find_if(module.symbols.begin(), module.symbols.end(), [&](const ModuleSymbol& symbol) {
            return symbol.relativeAddress == mapping->address
                && symbol.scope == ModuleSymbolScope::GeneratedPrivate;
        });
        return generated == module.symbols.end() ? LinkedWordKind::Data : LinkedWordKind::Literal;
    }
    return offset == mapping->address ? LinkedWordKind::Instruction : LinkedWordKind::Operand;
}

}  // namespace

LinkResult Linker::link(const ProjectLinkInput& input) const {
    LinkResult result;
    if (input.projectId.empty() || input.linkId.empty()) {
        result.diagnostics.push_back(linkDiagnostic(
            "linker.invalidProjectIdentity",
            "Project and link identity are required"
        ));
        return result;
    }
    if (input.modules.empty() || input.modules.size() > kMaximumModules) {
        result.diagnostics.push_back(linkDiagnostic(
            "linker.invalidModuleOrder",
            "Project module count is outside the supported range",
            {{"moduleCount", static_cast<int>(input.modules.size())}}
        ));
        return result;
    }
    if (input.mainModuleId.empty()) {
        result.diagnostics.push_back(linkDiagnostic("linker.missingMainModule", "A main module is required"));
        return result;
    }

    std::unordered_set<std::string> moduleIds;
    for (const auto& module : input.modules) {
        if (module.moduleId.empty() || !moduleIds.insert(module.moduleId).second) {
            result.diagnostics.push_back(linkDiagnostic(
                "linker.invalidModuleOrder",
                "Module order contains an empty or duplicate identity",
                {{"moduleId", module.moduleId}}
            ));
        }
    }
    const auto main = std::find_if(input.modules.begin(), input.modules.end(), [&](const LinkModuleInput& module) {
        return module.moduleId == input.mainModuleId;
    });
    if (main == input.modules.end()) {
        result.diagnostics.push_back(linkDiagnostic(
            "linker.missingMainModule",
            "The selected main module is not present",
            {{"moduleId", input.mainModuleId}}
        ));
    } else if (input.modules.front().moduleId != input.mainModuleId) {
        result.diagnostics.push_back(linkDiagnostic(
            "linker.invalidModuleOrder",
            "The main module must be first in module order",
            {{"moduleId", input.mainModuleId}}
        ));
    }
    if (!result.diagnostics.empty()) return result;

    Assembler assembler;
    auto& linked = result.value;
    linked.projectId = input.projectId;
    linked.linkId = input.linkId;
    linked.linkRevision = input.linkRevision;
    linked.mainModuleId = input.mainModuleId;

    for (const auto& module : input.modules) {
        auto assembly = assembler.assembleModule(module.source);
        if (!assembly.ok) {
            for (auto diagnostic : assembly.diagnostics) {
                diagnostic.fileName = module.displayName;
                result.diagnostics.push_back(std::move(diagnostic));
            }
            continue;
        }
        if (input.modules.size() > 1 && assembly.value.programName.empty()) {
            result.diagnostics.push_back(linkDiagnostic(
                "linker.invalidProgramName",
                "Each linked module requires a START program label",
                {{"moduleId", module.moduleId}},
                1,
                std::nullopt,
                module.displayName
            ));
            continue;
        }
        linked.moduleAssemblies.push_back({module, std::move(assembly.value)});
    }
    if (!result.diagnostics.empty()) return result;

    std::uint32_t nextAddress = kDefaultStartAddress;
    for (const auto& owned : linked.moduleAssemblies) {
        const auto wordCount = owned.assembly.moduleSize;
        const auto endAddress = nextAddress + wordCount;
        if (endAddress > kMemorySize) {
            result.diagnostics.push_back(linkDiagnostic(
                "linker.projectMemoryOverflow",
                "Linked program exceeds COMET II memory",
                {{"moduleId", owned.input.moduleId}, {"wordCount", static_cast<int>(wordCount)}}
            ));
            return result;
        }
        linked.placements.push_back({
            owned.input.moduleId,
            nextAddress,
            wordCount,
            endAddress
        });
        nextAddress = endAddress;
    }

    std::unordered_map<std::string, std::size_t> moduleIndex;
    for (std::size_t index = 0; index < linked.moduleAssemblies.size(); ++index) {
        moduleIndex.emplace(linked.moduleAssemblies[index].input.moduleId, index);
    }

    struct ExportOwner {
        std::size_t moduleIndex = 0;
        const ModuleSymbol* symbol = nullptr;
    };
    std::unordered_map<std::string, ExportOwner> exports;
    for (std::size_t index = 0; index < linked.moduleAssemblies.size(); ++index) {
        const auto& owned = linked.moduleAssemblies[index];
        for (const auto& symbol : owned.assembly.symbols) {
            if (symbol.scope != ModuleSymbolScope::ModuleExported) continue;
            const auto [existing, inserted] = exports.emplace(symbol.normalizedName, ExportOwner{index, &symbol});
            if (!inserted) {
                auto diagnostic = linkDiagnostic(
                    "linker.duplicateExportedProgram",
                    "Duplicate exported program symbol: " + symbol.name,
                    {{"symbol", symbol.name}},
                    symbol.line,
                    symbol.definitionRange,
                    owned.input.displayName
                );
                const auto& firstOwner = linked.moduleAssemblies[existing->second.moduleIndex];
                diagnostic.relatedLocations.push_back({
                    "diagnostic.firstDeclaredHere",
                    existing->second.symbol->definitionRange,
                    firstOwner.input.displayName
                });
                result.diagnostics.push_back(std::move(diagnostic));
            }
        }
    }
    if (!result.diagnostics.empty()) return result;

    linked.words.reserve(nextAddress - kDefaultStartAddress);
    for (const auto& owned : linked.moduleAssemblies) {
        linked.words.insert(linked.words.end(), owned.assembly.words.begin(), owned.assembly.words.end());
    }

    std::unordered_set<std::uint32_t> relocationTargets;
    for (std::size_t index = 0; index < linked.moduleAssemblies.size(); ++index) {
        const auto& owned = linked.moduleAssemblies[index];
        const auto baseAddress = linked.placements[index].baseAddress;
        for (const auto& relocation : owned.assembly.relocations) {
            const auto linkedWordIndex =
                baseAddress - kDefaultStartAddress + relocation.wordOffset;
            const auto linkedAddress = baseAddress + relocation.wordOffset;
            if (linkedWordIndex >= linked.words.size() || !relocationTargets.insert(linkedAddress).second) {
                result.diagnostics.push_back(linkDiagnostic(
                    "linker.duplicateRelocationTarget",
                    "Invalid or duplicate relocation target",
                    {{"address", static_cast<int>(linkedAddress)}},
                    relocation.line,
                    relocation.sourceRange,
                    owned.input.displayName
                ));
                continue;
            }

            const ModuleSymbol* target = nullptr;
            std::size_t targetModuleIndex = index;
            if (relocation.external) {
                const auto exported = exports.find(relocation.normalizedSymbolName);
                if (exported == exports.end()) {
                    result.diagnostics.push_back(linkDiagnostic(
                        "linker.unresolvedExternalSymbol",
                        "Unresolved external program symbol: " + relocation.symbolName,
                        {{"symbol", relocation.symbolName}},
                        relocation.line,
                        relocation.sourceRange,
                        owned.input.displayName
                    ));
                    continue;
                }
                targetModuleIndex = exported->second.moduleIndex;
                target = exported->second.symbol;
            } else {
                target = findModuleSymbol(owned.assembly, relocation.normalizedSymbolName);
            }
            if (!target) {
                result.diagnostics.push_back(linkDiagnostic(
                    "linker.unresolvedExternalSymbol",
                    "Unresolved symbol: " + relocation.symbolName,
                    {{"symbol", relocation.symbolName}},
                    relocation.line,
                    relocation.sourceRange,
                    owned.input.displayName
                ));
                continue;
            }

            const auto resolved = static_cast<std::int64_t>(linked.placements[targetModuleIndex].baseAddress)
                + target->relativeAddress + relocation.addend;
            if (resolved < 0 || resolved > std::numeric_limits<std::uint16_t>::max()) {
                result.diagnostics.push_back(linkDiagnostic(
                    "linker.relocationOverflow",
                    "Relocation exceeds the 16-bit address range",
                    {{"symbol", relocation.symbolName}},
                    relocation.line,
                    relocation.sourceRange,
                    owned.input.displayName
                ));
                continue;
            }
            linked.words[linkedWordIndex] = static_cast<std::uint16_t>(resolved);
            linked.relocations.push_back({
                relocation.relocationId,
                owned.input.moduleId,
                relocation.kind,
                static_cast<std::uint16_t>(linkedAddress),
                relocation.symbolName,
                linked.moduleAssemblies[targetModuleIndex].input.moduleId,
                static_cast<std::uint16_t>(resolved)
            });
        }
    }
    if (!result.diagnostics.empty()) return result;

    for (std::size_t index = 0; index < linked.moduleAssemblies.size(); ++index) {
        const auto& owned = linked.moduleAssemblies[index];
        const auto baseAddress = linked.placements[index].baseAddress;
        for (const auto& symbol : owned.assembly.symbols) {
            const auto address = static_cast<std::uint16_t>(baseAddress + symbol.relativeAddress);
            if (symbol.scope == ModuleSymbolScope::ModuleExported) {
                linked.symbols.push_back({
                    owned.input.moduleId,
                    symbol.name,
                    symbol.normalizedName,
                    symbol.scope,
                    address
                });
            }
            const auto qualified = normalizedSymbol(
                (owned.assembly.programName.empty() ? owned.input.moduleId : owned.assembly.programName)
                + "." + symbol.name
            );
            linked.program.symbols.emplace(qualified, address);
            if (symbol.scope == ModuleSymbolScope::ModuleExported || linked.moduleAssemblies.size() == 1) {
                linked.program.symbols.emplace(symbol.normalizedName, address);
            }
        }

        for (std::uint32_t offset = 0; offset < owned.assembly.moduleSize; ++offset) {
            const auto address = static_cast<std::uint16_t>(baseAddress + offset);
            const auto value = linked.words[baseAddress - kDefaultStartAddress + offset];
            linked.program.state.memory[address] = value;
            const auto* mapping = sourceMappingForOffset(owned.assembly, offset);
            linked.wordOwnership.push_back({
                address,
                owned.input.moduleId,
                offset,
                wordKindForOffset(owned.assembly, offset),
                mapping
                    ? owned.input.moduleId + ":line:" + std::to_string(mapping->line)
                        + ":offset:" + std::to_string(mapping->address)
                    : std::string{}
            });
        }

        for (const auto& relative : owned.assembly.sourceMap.entries()) {
            SourceMapEntry mapping = relative;
            mapping.address = static_cast<std::uint16_t>(baseAddress + relative.address);
            mapping.moduleId = owned.input.moduleId;
            mapping.sourceUnitId = owned.input.sourceUnitId;
            mapping.sourceMappingId = owned.input.moduleId + ":line:" + std::to_string(relative.line)
                + ":offset:" + std::to_string(relative.address);
            mapping.machineWords.clear();
            mapping.machineWords.reserve(relative.machineWords.size());
            for (std::size_t wordIndex = 0; wordIndex < relative.machineWords.size(); ++wordIndex) {
                mapping.machineWords.push_back(linked.program.state.memory[mapping.address + wordIndex]);
            }
            linked.program.sourceMap.add(std::move(mapping));
        }

        for (const auto& relative : owned.assembly.instructions) {
            Instruction instruction = relative;
            instruction.address = static_cast<std::uint16_t>(baseAddress + relative.address);
            instruction.moduleId = owned.input.moduleId;
            instruction.sourceUnitId = owned.input.sourceUnitId;
            instruction.sourceMappingId = owned.input.moduleId + ":line:" + std::to_string(relative.line)
                + ":offset:" + std::to_string(relative.address);
            if (instruction.size > 1) {
                instruction.operandAddress = linked.program.state.memory[instruction.address + 1];
            }
            linked.program.instructions.push_back(std::move(instruction));
        }
    }

    const auto mainIndex = moduleIndex.at(input.mainModuleId);
    const auto& mainAssembly = linked.moduleAssemblies[mainIndex].assembly;
    linked.entryPoint = static_cast<std::uint16_t>(
        linked.placements[mainIndex].baseAddress + mainAssembly.entryOffset
    );
    linked.program.entryPoint = linked.entryPoint;
    linked.program.state.pr = linked.entryPoint;
    linked.program.state.mar = linked.entryPoint;
    linked.program.state.sp = kDefaultStackPointer;
    linked.program.state.runState = RunState::Ready;
    linked.program.state.visualPath = VisualPathKind::Ready_PrToMar;
    linked.program.state.projectId = input.projectId;
    linked.program.state.linkId = input.linkId;
    linked.program.state.linkRevision = input.linkRevision;
    if (!linked.program.instructions.empty()) {
        linked.program.state.currentLine = linked.program.instructions.front().line;
        linked.program.state.currentInstruction = linked.program.instructions.front().source;
    }

    result.ok = true;
    return result;
}

}  // namespace casl
