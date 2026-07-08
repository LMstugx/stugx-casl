#include "InstructionSet.hpp"

#include <algorithm>
#include <cctype>
#include <stdexcept>

namespace casl {
namespace {

std::string upper(std::string_view text) {
    std::string value(text);
    std::transform(value.begin(), value.end(), value.begin(), [](unsigned char ch) {
        return static_cast<char>(std::toupper(ch));
    });
    return value;
}

}  // namespace

std::optional<Opcode> parseOpcode(std::string_view text) {
    const auto op = upper(text);
    if (op == "START") return Opcode::START;
    if (op == "END") return Opcode::END;
    if (op == "DC") return Opcode::DC;
    if (op == "DS") return Opcode::DS;
    if (op == "LD") return Opcode::LD;
    if (op == "ADDA") return Opcode::ADDA;
    if (op == "ST") return Opcode::ST;
    if (op == "RET") return Opcode::RET;
    return std::nullopt;
}

std::string opcodeName(Opcode opcode) {
    switch (opcode) {
        case Opcode::START: return "START";
        case Opcode::END: return "END";
        case Opcode::DC: return "DC";
        case Opcode::DS: return "DS";
        case Opcode::LD: return "LD";
        case Opcode::ADDA: return "ADDA";
        case Opcode::ST: return "ST";
        case Opcode::RET: return "RET";
    }
    return "UNKNOWN";
}

bool isExecutableOpcode(Opcode opcode) {
    return opcode == Opcode::LD || opcode == Opcode::ADDA || opcode == Opcode::ST || opcode == Opcode::RET;
}

bool hasAddressOperand(Opcode opcode) {
    return opcode == Opcode::LD || opcode == Opcode::ADDA || opcode == Opcode::ST;
}

std::uint16_t encodeInstruction(Opcode opcode, std::uint8_t gr) {
    switch (opcode) {
        case Opcode::LD: return static_cast<std::uint16_t>(0x1000 | (gr << 4));
        case Opcode::ADDA: return static_cast<std::uint16_t>(0x2000 | (gr << 4));
        case Opcode::ST: return static_cast<std::uint16_t>(0x1100 | (gr << 4));
        case Opcode::RET: return 0x8100;
        default: throw std::invalid_argument("Opcode has no machine encoding");
    }
}

}  // namespace casl
