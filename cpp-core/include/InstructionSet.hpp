#pragma once

#include <cstdint>
#include <optional>
#include <string>
#include <string_view>

namespace casl {

enum class Opcode {
    START,
    END,
    DC,
    DS,
    LD,
    ADDA,
    ST,
    RET
};

using InstructionKind = Opcode;

std::optional<Opcode> parseOpcode(std::string_view text);
std::string opcodeName(Opcode opcode);
bool isExecutableOpcode(Opcode opcode);
bool hasAddressOperand(Opcode opcode);
std::uint16_t encodeInstruction(Opcode opcode, std::uint8_t gr);

}  // namespace casl
