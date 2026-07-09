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
    if (op == "NOP") return Opcode::NOP;
    if (op == "LD") return Opcode::LD;
    if (op == "LAD") return Opcode::LAD;
    if (op == "ADDA") return Opcode::ADDA;
    if (op == "SUBA") return Opcode::SUBA;
    if (op == "ADDL") return Opcode::ADDL;
    if (op == "SUBL") return Opcode::SUBL;
    if (op == "AND") return Opcode::AND;
    if (op == "OR") return Opcode::OR;
    if (op == "XOR") return Opcode::XOR;
    if (op == "CPA") return Opcode::CPA;
    if (op == "CPL") return Opcode::CPL;
    if (op == "SLA") return Opcode::SLA;
    if (op == "SRA") return Opcode::SRA;
    if (op == "SLL") return Opcode::SLL;
    if (op == "SRL") return Opcode::SRL;
    if (op == "PUSH") return Opcode::PUSH;
    if (op == "POP") return Opcode::POP;
    if (op == "ST") return Opcode::ST;
    if (op == "JUMP") return Opcode::JUMP;
    if (op == "JZE") return Opcode::JZE;
    if (op == "JNZ") return Opcode::JNZ;
    if (op == "JPL") return Opcode::JPL;
    if (op == "JMI") return Opcode::JMI;
    if (op == "JOV") return Opcode::JOV;
    if (op == "RET") return Opcode::RET;
    return std::nullopt;
}

std::string opcodeName(Opcode opcode) {
    switch (opcode) {
        case Opcode::START: return "START";
        case Opcode::END: return "END";
        case Opcode::DC: return "DC";
        case Opcode::DS: return "DS";
        case Opcode::NOP: return "NOP";
        case Opcode::LD: return "LD";
        case Opcode::LAD: return "LAD";
        case Opcode::ADDA: return "ADDA";
        case Opcode::SUBA: return "SUBA";
        case Opcode::ADDL: return "ADDL";
        case Opcode::SUBL: return "SUBL";
        case Opcode::AND: return "AND";
        case Opcode::OR: return "OR";
        case Opcode::XOR: return "XOR";
        case Opcode::CPA: return "CPA";
        case Opcode::CPL: return "CPL";
        case Opcode::SLA: return "SLA";
        case Opcode::SRA: return "SRA";
        case Opcode::SLL: return "SLL";
        case Opcode::SRL: return "SRL";
        case Opcode::PUSH: return "PUSH";
        case Opcode::POP: return "POP";
        case Opcode::ST: return "ST";
        case Opcode::JUMP: return "JUMP";
        case Opcode::JZE: return "JZE";
        case Opcode::JNZ: return "JNZ";
        case Opcode::JPL: return "JPL";
        case Opcode::JMI: return "JMI";
        case Opcode::JOV: return "JOV";
        case Opcode::RET: return "RET";
    }
    return "UNKNOWN";
}

bool isExecutableOpcode(Opcode opcode) {
    return opcode == Opcode::NOP || opcode == Opcode::LD || opcode == Opcode::LAD || opcode == Opcode::ADDA ||
           opcode == Opcode::SUBA || opcode == Opcode::ADDL || opcode == Opcode::SUBL || opcode == Opcode::AND ||
           opcode == Opcode::OR || opcode == Opcode::XOR || opcode == Opcode::CPA || opcode == Opcode::CPL ||
           opcode == Opcode::SLA || opcode == Opcode::SRA || opcode == Opcode::SLL || opcode == Opcode::SRL ||
           opcode == Opcode::PUSH || opcode == Opcode::POP || opcode == Opcode::ST || opcode == Opcode::JUMP || opcode == Opcode::JZE || opcode == Opcode::JNZ ||
           opcode == Opcode::JPL || opcode == Opcode::JMI || opcode == Opcode::JOV || opcode == Opcode::RET;
}

bool hasAddressOperand(Opcode opcode) {
    return opcode == Opcode::LD || opcode == Opcode::LAD || opcode == Opcode::ADDA || opcode == Opcode::SUBA ||
           opcode == Opcode::ADDL || opcode == Opcode::SUBL || opcode == Opcode::AND || opcode == Opcode::OR ||
           opcode == Opcode::XOR || opcode == Opcode::CPA || opcode == Opcode::CPL || opcode == Opcode::SLA ||
           opcode == Opcode::SRA || opcode == Opcode::SLL || opcode == Opcode::SRL || opcode == Opcode::ST ||
           opcode == Opcode::JUMP || opcode == Opcode::JZE || opcode == Opcode::JNZ || opcode == Opcode::JPL ||
           opcode == Opcode::JMI || opcode == Opcode::JOV || opcode == Opcode::PUSH;
}

std::uint16_t encodeInstruction(Opcode opcode, std::uint8_t gr, std::uint8_t indexRegister) {
    const auto registerBits = static_cast<std::uint16_t>((gr & 0x0f) << 4);
    const auto indexBits = static_cast<std::uint16_t>(indexRegister & 0x0f);
    switch (opcode) {
        case Opcode::NOP: return 0x0000;
        case Opcode::LD: return static_cast<std::uint16_t>(0x1000 | registerBits | indexBits);
        case Opcode::LAD: return static_cast<std::uint16_t>(0x1200 | registerBits | indexBits);
        case Opcode::ADDA: return static_cast<std::uint16_t>(0x2000 | registerBits | indexBits);
        case Opcode::SUBA: return static_cast<std::uint16_t>(0x2100 | registerBits | indexBits);
        case Opcode::ADDL: return static_cast<std::uint16_t>(0x2200 | registerBits | indexBits);
        case Opcode::SUBL: return static_cast<std::uint16_t>(0x2300 | registerBits | indexBits);
        case Opcode::AND: return static_cast<std::uint16_t>(0x3000 | registerBits | indexBits);
        case Opcode::OR: return static_cast<std::uint16_t>(0x3100 | registerBits | indexBits);
        case Opcode::XOR: return static_cast<std::uint16_t>(0x3200 | registerBits | indexBits);
        case Opcode::CPA: return static_cast<std::uint16_t>(0x4000 | registerBits | indexBits);
        case Opcode::CPL: return static_cast<std::uint16_t>(0x4100 | registerBits | indexBits);
        case Opcode::SLA: return static_cast<std::uint16_t>(0x5000 | registerBits | indexBits);
        case Opcode::SRA: return static_cast<std::uint16_t>(0x5100 | registerBits | indexBits);
        case Opcode::SLL: return static_cast<std::uint16_t>(0x5200 | registerBits | indexBits);
        case Opcode::SRL: return static_cast<std::uint16_t>(0x5300 | registerBits | indexBits);
        case Opcode::PUSH: return static_cast<std::uint16_t>(0x7000 | indexBits);
        case Opcode::POP: return static_cast<std::uint16_t>(0x7100 | registerBits);
        case Opcode::ST: return static_cast<std::uint16_t>(0x1100 | registerBits | indexBits);
        case Opcode::JMI: return static_cast<std::uint16_t>(0x6100 | indexBits);
        case Opcode::JNZ: return static_cast<std::uint16_t>(0x6200 | indexBits);
        case Opcode::JZE: return static_cast<std::uint16_t>(0x6300 | indexBits);
        case Opcode::JUMP: return static_cast<std::uint16_t>(0x6400 | indexBits);
        case Opcode::JPL: return static_cast<std::uint16_t>(0x6500 | indexBits);
        case Opcode::JOV: return static_cast<std::uint16_t>(0x6600 | indexBits);
        case Opcode::RET: return 0x8100;
        default: throw std::invalid_argument("Opcode has no machine encoding");
    }
}

}  // namespace casl
