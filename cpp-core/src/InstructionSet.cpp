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
    if (op == "LAD") return Opcode::LAD;
    if (op == "ADDA") return Opcode::ADDA;
    if (op == "SUBA") return Opcode::SUBA;
    if (op == "CPA") return Opcode::CPA;
    if (op == "ST") return Opcode::ST;
    if (op == "JUMP") return Opcode::JUMP;
    if (op == "JZE") return Opcode::JZE;
    if (op == "JNZ") return Opcode::JNZ;
    if (op == "JPL") return Opcode::JPL;
    if (op == "JMI") return Opcode::JMI;
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
        case Opcode::LAD: return "LAD";
        case Opcode::ADDA: return "ADDA";
        case Opcode::SUBA: return "SUBA";
        case Opcode::CPA: return "CPA";
        case Opcode::ST: return "ST";
        case Opcode::JUMP: return "JUMP";
        case Opcode::JZE: return "JZE";
        case Opcode::JNZ: return "JNZ";
        case Opcode::JPL: return "JPL";
        case Opcode::JMI: return "JMI";
        case Opcode::RET: return "RET";
    }
    return "UNKNOWN";
}

bool isExecutableOpcode(Opcode opcode) {
    return opcode == Opcode::LD || opcode == Opcode::LAD || opcode == Opcode::ADDA || opcode == Opcode::SUBA ||
           opcode == Opcode::CPA || opcode == Opcode::ST || opcode == Opcode::JUMP || opcode == Opcode::JZE ||
           opcode == Opcode::JNZ || opcode == Opcode::JPL || opcode == Opcode::JMI || opcode == Opcode::RET;
}

bool hasAddressOperand(Opcode opcode) {
    return opcode == Opcode::LD || opcode == Opcode::LAD || opcode == Opcode::ADDA || opcode == Opcode::SUBA ||
           opcode == Opcode::CPA || opcode == Opcode::ST || opcode == Opcode::JUMP || opcode == Opcode::JZE ||
           opcode == Opcode::JNZ || opcode == Opcode::JPL || opcode == Opcode::JMI;
}

std::uint16_t encodeInstruction(Opcode opcode, std::uint8_t gr) {
    switch (opcode) {
        case Opcode::LD: return static_cast<std::uint16_t>(0x1000 | (gr << 4));
        case Opcode::LAD: return static_cast<std::uint16_t>(0x1200 | (gr << 4));
        case Opcode::ADDA: return static_cast<std::uint16_t>(0x2000 | (gr << 4));
        case Opcode::SUBA: return static_cast<std::uint16_t>(0x2100 | (gr << 4));
        case Opcode::CPA: return static_cast<std::uint16_t>(0x4000 | (gr << 4));
        case Opcode::ST: return static_cast<std::uint16_t>(0x1100 | (gr << 4));
        case Opcode::JMI: return 0x6100;
        case Opcode::JNZ: return 0x6200;
        case Opcode::JZE: return 0x6300;
        case Opcode::JUMP: return 0x6400;
        case Opcode::JPL: return 0x6500;
        case Opcode::RET: return 0x8100;
        default: throw std::invalid_argument("Opcode has no machine encoding");
    }
}

}  // namespace casl
