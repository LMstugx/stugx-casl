#pragma once

#include <cstdint>
#include <string>
#include <vector>

#include "Assembler.hpp"

namespace casl {

struct LinkModuleInput {
    std::string moduleId;
    std::string sourceUnitId;
    std::string moduleAssemblyId;
    std::string displayName;
    std::string source;
};

struct ProjectLinkInput {
    std::string projectId;
    std::string linkId;
    std::uint64_t linkRevision = 0;
    std::string mainModuleId;
    std::vector<LinkModuleInput> modules;
};

struct ModulePlacement {
    std::string moduleId;
    std::uint32_t baseAddress = 0;
    std::uint32_t wordCount = 0;
    std::uint32_t endAddressExclusive = 0;
};

struct LinkedSymbol {
    std::string moduleId;
    std::string name;
    std::string normalizedName;
    ModuleSymbolScope scope = ModuleSymbolScope::ModuleLocal;
    std::uint16_t address = 0;
};

struct AppliedRelocation {
    std::string relocationId;
    std::string moduleId;
    RelocationKind kind = RelocationKind::AbsoluteAddressWord;
    std::uint16_t linkedAddress = 0;
    std::string symbolName;
    std::string targetModuleId;
    std::uint16_t resolvedAddress = 0;
};

enum class LinkedWordKind {
    Instruction,
    Operand,
    Data,
    Storage,
    Literal
};

struct LinkedWordOwnership {
    std::uint16_t address = 0;
    std::string moduleId;
    std::uint32_t moduleRelativeOffset = 0;
    LinkedWordKind kind = LinkedWordKind::Storage;
    std::string sourceMappingId;
};

struct ModuleAssemblyOwnership {
    LinkModuleInput input;
    ModuleAssemblyOutput assembly;
};

struct LinkedProgramOutput {
    std::string projectId;
    std::string linkId;
    std::uint64_t linkRevision = 0;
    std::string mainModuleId;
    std::uint16_t entryPoint = kDefaultStartAddress;
    std::vector<ModuleAssemblyOwnership> moduleAssemblies;
    std::vector<ModulePlacement> placements;
    std::vector<std::uint16_t> words;
    std::vector<LinkedWordOwnership> wordOwnership;
    std::vector<LinkedSymbol> symbols;
    std::vector<AppliedRelocation> relocations;
    AssembleOutput program;
};

using LinkResult = Result<LinkedProgramOutput>;

class Linker {
public:
    [[nodiscard]] LinkResult link(const ProjectLinkInput& input) const;
};

}  // namespace casl
