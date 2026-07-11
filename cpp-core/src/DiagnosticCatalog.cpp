#include "DiagnosticCatalog.hpp"

#include <algorithm>
#include <cctype>
#include <string_view>

namespace casl {
namespace {

struct SourceLine {
    int line;
    std::size_t offset;
    std::string_view text;
};

bool startsWith(std::string_view value, std::string_view prefix) {
    return value.size() >= prefix.size() && value.substr(0, prefix.size()) == prefix;
}

std::string afterPrefix(std::string_view value, std::string_view prefix) {
    return startsWith(value, prefix) ? std::string(value.substr(prefix.size())) : std::string{};
}

void set(Diagnostic& diagnostic, std::string code, std::unordered_map<std::string, std::string> stringParams = {}) {
    diagnostic.code = std::move(code);
    diagnostic.params.clear();
    for (auto& [name, value] : stringParams) diagnostic.params.emplace(std::move(name), std::move(value));
    if (diagnostic.fallbackMessage.empty()) diagnostic.fallbackMessage = diagnostic.message;
}

std::vector<SourceLine> sourceLines(const std::string& source) {
    std::vector<SourceLine> lines;
    std::size_t offset = 0;
    int line = 1;
    while (offset <= source.size()) {
        const auto newline = source.find('\n', offset);
        const auto end = newline == std::string::npos ? source.size() : newline;
        auto textEnd = end;
        if (textEnd > offset && source[textEnd - 1] == '\r') --textEnd;
        lines.push_back({line, offset, std::string_view(source).substr(offset, textEnd - offset)});
        if (newline == std::string::npos) break;
        offset = newline + 1;
        ++line;
    }
    return lines;
}

SourcePosition positionAtOffset(const std::string& source, std::size_t requestedOffset) {
    const auto offset = std::min(requestedOffset, source.size());
    int line = 1;
    std::size_t lineStart = 0;
    for (std::size_t index = 0; index < offset; ++index) {
        if (source[index] == '\n') {
            ++line;
            lineStart = index + 1;
        }
    }
    return {line, static_cast<int>(offset - lineStart + 1), offset};
}

SourceRange offsetsToRange(const std::string& source, std::size_t start, std::size_t end) {
    const auto safeStart = std::min(start, source.size());
    const auto safeEnd = std::max(safeStart, std::min(end, source.size()));
    return {positionAtOffset(source, safeStart), positionAtOffset(source, safeEnd)};
}

std::optional<SourceRange> textRange(const std::string& source, int line, std::string_view token) {
    if (token.empty() || line < 1) return std::nullopt;
    const auto lines = sourceLines(source);
    const auto foundLine = std::find_if(lines.begin(), lines.end(), [line](const SourceLine& item) { return item.line == line; });
    if (foundLine == lines.end()) return std::nullopt;
    const auto position = foundLine->text.find(token);
    if (position == std::string_view::npos) return std::nullopt;
    return offsetsToRange(source, foundLine->offset + position, foundLine->offset + position + token.size());
}

std::optional<SourceRange> lastTextRange(const std::string& source, int line, std::string_view token) {
    if (token.empty() || line < 1) return std::nullopt;
    const auto lines = sourceLines(source);
    const auto foundLine = std::find_if(lines.begin(), lines.end(), [line](const SourceLine& item) { return item.line == line; });
    if (foundLine == lines.end()) return std::nullopt;
    const auto position = foundLine->text.rfind(token);
    if (position == std::string_view::npos) return std::nullopt;
    return offsetsToRange(source, foundLine->offset + position, foundLine->offset + position + token.size());
}

std::optional<std::string> stringParam(const Diagnostic& diagnostic, const std::string& name) {
    const auto found = diagnostic.params.find(name);
    if (found == diagnostic.params.end()) return std::nullopt;
    if (const auto* value = std::get_if<std::string>(&found->second)) return *value;
    return std::nullopt;
}

std::optional<SourceRange> firstLabelRange(const std::string& source, std::string_view label, int beforeLine) {
    for (const auto& item : sourceLines(source)) {
        if (item.line >= beforeLine) break;
        const auto first = item.text.find_first_not_of(" \t");
        if (first == std::string_view::npos || item.text.substr(first, label.size()) != label) continue;
        const auto after = first + label.size();
        if (after < item.text.size() && std::isspace(static_cast<unsigned char>(item.text[after])) == 0) continue;
        return offsetsToRange(source, item.offset + first, item.offset + after);
    }
    return std::nullopt;
}

void attachSourceMetadata(Diagnostic& diagnostic, const std::string& source) {
    if (diagnostic.sourceRange.has_value() || diagnostic.code.empty()) return;
    if (diagnostic.code == "assembler.missingEnd") {
        diagnostic.sourceRange = offsetsToRange(source, source.size(), source.size());
        return;
    }
    if (diagnostic.code == "assembler.missingStart") {
        std::size_t insertion = 0;
        for (const auto& item : sourceLines(source)) {
            const auto meaningful = item.text.find_first_not_of(" \t");
            if (meaningful == std::string_view::npos || item.text[meaningful] == ';') continue;
            insertion = item.offset + meaningful;
            break;
        }
        diagnostic.sourceRange = offsetsToRange(source, insertion, insertion);
        return;
    }
    if (diagnostic.code == "assembler.malformedOperandList") {
        diagnostic.sourceRange = lastTextRange(source, diagnostic.line, ",");
        return;
    }

    const std::pair<const char*, const char*> tokenParams[] = {
        {"assembler.unknownOpcode", "opcode"}, {"assembler.unknownSymbol", "symbol"},
        {"assembler.duplicateLabel", "label"}, {"assembler.invalidRegister", "register"},
        {"assembler.invalidIndexRegister", "indexRegister"}, {"assembler.invalidOperandCount", "mnemonic"},
        {"assembler.addressOutOfRange", "value"}, {"assembler.literalOutOfRange", "value"}
    };
    for (const auto& [code, param] : tokenParams) {
        if (diagnostic.code != code) continue;
        const auto token = stringParam(diagnostic, param);
        if (token.has_value()) diagnostic.sourceRange = textRange(source, diagnostic.line, *token);
        break;
    }

    if (diagnostic.code == "assembler.duplicateLabel") {
        const auto label = stringParam(diagnostic, "label");
        if (!label.has_value()) return;
        const auto first = firstLabelRange(source, *label, diagnostic.line);
        if (!first.has_value()) return;
        diagnostic.params["firstLine"] = first->start.line;
        diagnostic.params["duplicateLine"] = diagnostic.line;
        diagnostic.relatedLocations.push_back({"diagnostic.firstDeclaredHere", *first, {}});
    }
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

void structureDiagnostics(std::vector<Diagnostic>& diagnostics, const std::string& source) {
    for (auto& diagnostic : diagnostics) {
        structureDiagnostic(diagnostic);
        attachSourceMetadata(diagnostic, source);
    }
}

}  // namespace casl
