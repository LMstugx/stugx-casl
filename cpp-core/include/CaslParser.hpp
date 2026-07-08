#pragma once

#include <cstdint>
#include <optional>
#include <string>
#include <vector>

#include "CometState.hpp"
#include "InstructionSet.hpp"

namespace casl {

struct ParsedLine {
    int line = 0;
    std::string raw;
    std::string source;
    std::string label;
    std::optional<Opcode> opcode;
    std::string opcodeText;
    std::vector<std::string> operands;
    std::uint16_t address = 0;
};

class CaslParser {
public:
    [[nodiscard]] Result<std::vector<ParsedLine>> parse(const std::string& source) const;
};

}  // namespace casl
