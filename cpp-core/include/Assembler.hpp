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
    std::optional<std::uint16_t> operandAddress;
    std::string operandLabel;
    std::uint8_t indexRegister = 0;
    std::uint8_t size = 1;
};

struct AssembleOutput {
    CometState state;
    SourceMap sourceMap;
    std::unordered_map<std::string, std::uint16_t> symbols;
    std::vector<Instruction> instructions;
};

using AssembleResult = Result<AssembleOutput>;

class Assembler {
public:
    [[nodiscard]] AssembleResult assemble(const std::string& source) const;

private:
    bool pass1(std::vector<ParsedLine>& lines, AssembleOutput& output, std::vector<Diagnostic>& diagnostics) const;
    bool pass2(const std::vector<ParsedLine>& lines, AssembleOutput& output, std::vector<Diagnostic>& diagnostics) const;
};

}  // namespace casl
