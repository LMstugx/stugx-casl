#pragma once

#include <cstdint>
#include <optional>
#include <string>
#include <unordered_map>
#include <vector>

#include "CaslParser.hpp"
#include "CometState.hpp"
#include "SourceMap.hpp"

namespace casl {

struct Instruction {
    std::uint16_t address = 0;
    int line = 0;
    Opcode opcode = Opcode::RET;
    std::string source;
    std::uint8_t gr = 0;
    std::optional<std::uint8_t> sourceRegister;
    std::optional<std::uint16_t> operandAddress;
    std::string operandLabel;
    std::uint8_t indexRegister = 0;
    std::uint8_t size = 1;
    std::string moduleId;
    std::string sourceUnitId;
    std::string sourceMappingId;
};

struct AssembleOutput {
    CometState state;
    SourceMap sourceMap;
    std::unordered_map<std::string, std::uint16_t> symbols;
    std::vector<Instruction> instructions;
    std::uint16_t entryPoint = kDefaultStartAddress;
};

using AssembleResult = Result<AssembleOutput>;

enum class RelocationKind {
    AbsoluteAddressWord,
    CallTarget,
    DataAddressConstant
};

struct RelocationRecord {
    std::string relocationId;
    std::uint32_t wordOffset = 0;
    RelocationKind kind = RelocationKind::AbsoluteAddressWord;
    std::string symbolName;
    std::string normalizedSymbolName;
    std::int32_t addend = 0;
    int line = 0;
    SourceRange sourceRange{};
    bool external = false;
};

enum class ModuleSymbolScope {
    ModuleLocal,
    ModuleExported,
    GeneratedPrivate
};

struct ModuleSymbol {
    std::string symbolId;
    std::string name;
    std::string normalizedName;
    ModuleSymbolScope scope = ModuleSymbolScope::ModuleLocal;
    std::uint32_t relativeAddress = 0;
    int line = 0;
    SourceRange definitionRange{};
};

struct ModuleAssemblyOutput {
    std::string programName;
    std::optional<std::string> requestedEntrySymbol;
    std::vector<std::uint16_t> words;
    std::vector<Instruction> instructions;
    SourceMap sourceMap;
    std::vector<ModuleSymbol> symbols;
    std::vector<RelocationRecord> relocations;
    std::uint32_t moduleSize = 0;
    std::uint32_t entryOffset = 0;
};

using ModuleAssemblyResult = Result<ModuleAssemblyOutput>;

class Assembler {
public:
    [[nodiscard]] AssembleResult assemble(const std::string& source) const;
    [[nodiscard]] ModuleAssemblyResult assembleModule(const std::string& source) const;

private:
    bool pass1(
        std::vector<ParsedLine>& lines,
        AssembleOutput& output,
        std::vector<Diagnostic>& diagnostics,
        std::uint32_t startAddress = kDefaultStartAddress
    ) const;
    bool pass2(const std::vector<ParsedLine>& lines, AssembleOutput& output, std::vector<Diagnostic>& diagnostics) const;
};

}  // namespace casl
