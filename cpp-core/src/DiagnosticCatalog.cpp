#include "DiagnosticCatalog.hpp"

#include <string_view>

namespace casl {
namespace {

bool startsWith(std::string_view value, std::string_view prefix) {
    return value.size() >= prefix.size() && value.substr(0, prefix.size()) == prefix;
}

std::string afterPrefix(std::string_view value, std::string_view prefix) {
    return startsWith(value, prefix) ? std::string(value.substr(prefix.size())) : std::string{};
}

void set(Diagnostic& diagnostic, std::string code, std::unordered_map<std::string, std::string> params = {}) {
    diagnostic.code = std::move(code);
    diagnostic.params = std::move(params);
    if (diagnostic.fallbackMessage.empty()) diagnostic.fallbackMessage = diagnostic.message;
}

}  // namespace

void structureDiagnostic(Diagnostic& diagnostic) {
    if (!diagnostic.code.empty()) return;
    const std::string_view message = diagnostic.message;

    if (message == "CASL source must contain START directive") return set(diagnostic, "assembler.missingStart");
    if (message == "CASL source must contain END directive") return set(diagnostic, "assembler.missingEnd");
    if (message == "Malformed operand list near comma") return set(diagnostic, "assembler.malformedOperandList");
    if (message == "GR0 cannot be used as an index register") return set(diagnostic, "assembler.invalidIndexRegister", {{"indexRegister", "GR0"}});
    if (message == "No program loaded") return set(diagnostic, "vm.notLoaded");
    if (message == "Max steps reached" || message == "Max steps reached before execution") return set(diagnostic, "vm.stepLimitReached");
    if (message == "Illegal opcode" || message == "No instruction at PR") return set(diagnostic, "vm.invalidInstruction");

    if (startsWith(message, "Unknown opcode: ")) return set(diagnostic, "assembler.unknownOpcode", {{"opcode", afterPrefix(message, "Unknown opcode: ")}});
    if (startsWith(message, "Undefined label: ")) return set(diagnostic, "assembler.unknownSymbol", {{"symbol", afterPrefix(message, "Undefined label: ")}});
    if (startsWith(message, "Duplicate label: ")) return set(diagnostic, "assembler.duplicateLabel", {{"label", afterPrefix(message, "Duplicate label: ")}});
    if (startsWith(message, "Invalid register: ")) return set(diagnostic, "assembler.invalidRegister", {{"register", afterPrefix(message, "Invalid register: ")}});
    if (startsWith(message, "Invalid index register: ")) return set(diagnostic, "assembler.invalidIndexRegister", {{"indexRegister", afterPrefix(message, "Invalid index register: ")}});

    if (message.find("requires register and address operands") != std::string_view::npos ||
        message.find("requires an address operand") != std::string_view::npos ||
        message.find("requires a register operand") != std::string_view::npos ||
        message.find("has too many operands") != std::string_view::npos ||
        message.find("does not support index operands") != std::string_view::npos) {
        const auto separator = message.find(' ');
        return set(diagnostic, "assembler.invalidOperandCount", {{"mnemonic", std::string(message.substr(0, separator))}});
    }

    if (message.find("address out of range") != std::string_view::npos ||
        startsWith(message, "Address operand out of 16-bit range: ") ||
        message == "Program memory exceeds 0xFFFF") {
        const auto separator = message.rfind(": ");
        return set(diagnostic, "assembler.addressOutOfRange", separator == std::string_view::npos ? std::unordered_map<std::string, std::string>{} : std::unordered_map<std::string, std::string>{{"value", std::string(message.substr(separator + 2))}});
    }

    if (startsWith(message, "Invalid numeric literal") || message.find("value out of 16-bit range") != std::string_view::npos) {
        const auto separator = message.rfind(": ");
        return set(diagnostic, "assembler.literalOutOfRange", separator == std::string_view::npos ? std::unordered_map<std::string, std::string>{} : std::unordered_map<std::string, std::string>{{"value", std::string(message.substr(separator + 2))}});
    }
}

void structureDiagnostics(std::vector<Diagnostic>& diagnostics) {
    for (auto& diagnostic : diagnostics) structureDiagnostic(diagnostic);
}

}  // namespace casl
