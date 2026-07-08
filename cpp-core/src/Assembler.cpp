#include "Assembler.hpp"

#include <algorithm>
#include <charconv>
#include <cctype>
#include <limits>
#include <utility>

namespace casl {
namespace {

bool isAddressInRange(std::uint32_t address) {
    return address < kMemorySize;
}

std::optional<std::uint32_t> parseNumber(const std::string& text) {
    if (text.empty()) return std::nullopt;

    int base = 10;
    std::string view = text;
    if (view.size() > 1 && view[0] == '#') {
        base = 16;
        view = view.substr(1);
    } else if (view.size() > 2 && view[0] == '0' && (view[1] == 'x' || view[1] == 'X')) {
        base = 16;
        view = view.substr(2);
    }

    std::uint32_t value = 0;
    const auto begin = view.data();
    const auto end = begin + view.size();
    const auto parsed = std::from_chars(begin, end, value, base);
    if (parsed.ec != std::errc{} || parsed.ptr != end) return std::nullopt;
    return value;
}

std::optional<std::uint32_t> instructionSize(const ParsedLine& line, std::vector<Diagnostic>& diagnostics) {
    if (!line.opcode.has_value()) return 0;
    const auto opcode = *line.opcode;
    if (opcode == Opcode::LD || opcode == Opcode::ADDA || opcode == Opcode::ST) return 2;
    if (opcode == Opcode::RET) return 1;
    if (opcode == Opcode::DC) return static_cast<std::uint32_t>(std::max<std::size_t>(1, line.operands.size()));
    if (opcode == Opcode::DS) {
        const auto count = parseNumber(line.operands.empty() ? "" : line.operands[0]);
        if (!count.has_value()) {
            diagnostics.push_back({line.line, Severity::Error, "DS requires a numeric size"});
            return std::nullopt;
        }
        return *count;
    }
    return 0;
}

std::optional<std::uint8_t> parseRegister(const std::string& token) {
    if (token.size() != 3) return std::nullopt;
    if (token[0] != 'G' && token[0] != 'g') return std::nullopt;
    if (token[1] != 'R' && token[1] != 'r') return std::nullopt;
    if (token[2] < '0' || token[2] > '7') return std::nullopt;
    return static_cast<std::uint8_t>(token[2] - '0');
}

void addDiagnostic(std::vector<Diagnostic>& diagnostics, int line, std::string message) {
    diagnostics.push_back({line, Severity::Error, std::move(message)});
}

std::string symbolKey(const std::string& label) {
    std::string key(label);
    std::transform(key.begin(), key.end(), key.begin(), [](unsigned char ch) {
        return static_cast<char>(std::toupper(ch));
    });
    return key;
}

}  // namespace

AssembleResult Assembler::assemble(const std::string& source) const {
    AssembleResult result;
    CaslParser parser;
    auto parsed = parser.parse(source);
    result.diagnostics = parsed.diagnostics;

    auto lines = std::move(parsed.value);
    const auto pass1Ok = pass1(lines, result.value, result.diagnostics);
    const auto pass2Ok = pass1Ok && pass2(lines, result.value, result.diagnostics);

    result.ok = parsed.ok && pass1Ok && pass2Ok && result.diagnostics.empty();
    result.value.state.runState = result.ok ? RunState::Ready : RunState::Error;
    result.value.state.visualPath = result.ok ? VisualPathKind::Ready_PrToMar : VisualPathKind::None;
    result.value.state.pr = kDefaultStartAddress;
    result.value.state.mar = kDefaultStartAddress;
    result.value.state.sp = kDefaultStackPointer;
    if (!result.value.instructions.empty()) {
        result.value.state.currentLine = result.value.instructions.front().line;
        result.value.state.currentInstruction = result.value.instructions.front().source;
    }

    return result;
}

bool Assembler::pass1(std::vector<ParsedLine>& lines, AssembleOutput& output, std::vector<Diagnostic>& diagnostics) const {
    bool ok = true;
    std::uint32_t address = kDefaultStartAddress;

    for (auto& line : lines) {
        if (!line.opcode.has_value()) {
            ok = false;
            continue;
        }

        const auto opcode = *line.opcode;
        if (opcode == Opcode::START) {
            address = kDefaultStartAddress;
            line.address = static_cast<std::uint16_t>(address);
        } else {
            line.address = static_cast<std::uint16_t>(address);
        }

        if (!line.label.empty()) {
            const auto key = symbolKey(line.label);
            if (output.symbols.find(key) != output.symbols.end()) {
                addDiagnostic(diagnostics, line.line, "Duplicate label: " + line.label);
                ok = false;
            } else {
                output.symbols.emplace(key, line.address);
            }
        }

        if (opcode == Opcode::START || opcode == Opcode::END) continue;

        const auto diagnosticCount = diagnostics.size();
        const auto size = instructionSize(line, diagnostics);
        if (!size.has_value() || diagnostics.size() != diagnosticCount) {
            ok = false;
            continue;
        }

        const auto nextAddress = address + *size;
        if (nextAddress > kMemorySize) {
            addDiagnostic(diagnostics, line.line, "Program memory exceeds 0xFFFF");
            ok = false;
        } else {
            address = nextAddress;
        }
    }

    return ok;
}

bool Assembler::pass2(const std::vector<ParsedLine>& lines, AssembleOutput& output, std::vector<Diagnostic>& diagnostics) const {
    bool ok = true;

    for (const auto& line : lines) {
        if (!line.opcode.has_value()) continue;
        const auto opcode = *line.opcode;
        if (opcode == Opcode::START || opcode == Opcode::END) continue;

        if (opcode == Opcode::LD || opcode == Opcode::ADDA || opcode == Opcode::ST) {
            if (line.operands.size() != 2) {
                addDiagnostic(diagnostics, line.line, opcodeName(opcode) + " requires register and label operands");
                ok = false;
                continue;
            }

            const auto gr = parseRegister(line.operands[0]);
            if (!gr.has_value()) {
                addDiagnostic(diagnostics, line.line, "Invalid register: " + line.operands[0]);
                ok = false;
                continue;
            }

            const auto symbol = output.symbols.find(symbolKey(line.operands[1]));
            if (symbol == output.symbols.end()) {
                addDiagnostic(diagnostics, line.line, "Undefined label: " + line.operands[1]);
                ok = false;
                continue;
            }

            const auto machine = encodeInstruction(opcode, *gr);
            output.state.memory[line.address] = machine;
            output.state.memory[static_cast<std::uint16_t>(line.address + 1)] = symbol->second;
            output.sourceMap.add({line.line, line.address, {machine, symbol->second}, line.source, line.label, opcode});
            output.instructions.push_back({line.address, line.line, opcode, line.source, *gr, symbol->second, line.operands[1], 2});
            continue;
        }

        if (opcode == Opcode::RET) {
            const auto machine = encodeInstruction(Opcode::RET, 0);
            output.state.memory[line.address] = machine;
            output.sourceMap.add({line.line, line.address, {machine}, line.source, line.label, opcode});
            output.instructions.push_back({line.address, line.line, opcode, line.source, 0, std::nullopt, {}, 1});
            continue;
        }

        if (opcode == Opcode::DC) {
            const auto count = std::max<std::size_t>(1, line.operands.size());
            std::vector<std::uint16_t> words;
            words.reserve(count);
            for (std::size_t index = 0; index < count; index += 1) {
                const auto token = line.operands.empty() ? "0" : line.operands[index];
                const auto value = parseNumber(token);
                if (!value.has_value() || *value > 0xffff) {
                    addDiagnostic(diagnostics, line.line, "DC value out of 16-bit range: " + token);
                    ok = false;
                    continue;
                }
                const auto address = static_cast<std::uint32_t>(line.address) + index;
                if (!isAddressInRange(address)) {
                    addDiagnostic(diagnostics, line.line, "DC address out of range");
                    ok = false;
                    continue;
                }
                output.state.memory[address] = static_cast<std::uint16_t>(*value);
                words.push_back(static_cast<std::uint16_t>(*value));
            }
            output.sourceMap.add({line.line, line.address, words, line.source, line.label, opcode});
            continue;
        }

        if (opcode == Opcode::DS) {
            const auto count = parseNumber(line.operands.empty() ? "" : line.operands[0]);
            if (!count.has_value()) {
                addDiagnostic(diagnostics, line.line, "DS requires a numeric size");
                ok = false;
                continue;
            }
            if (static_cast<std::uint32_t>(line.address) + *count > kMemorySize) {
                addDiagnostic(diagnostics, line.line, "DS address out of range");
                ok = false;
                continue;
            }
            std::vector<std::uint16_t> words;
            words.reserve(*count);
            for (std::uint32_t offset = 0; offset < *count; offset += 1) {
                const auto address = static_cast<std::uint32_t>(line.address) + offset;
                if (!isAddressInRange(address)) {
                    addDiagnostic(diagnostics, line.line, "DS address out of range");
                    ok = false;
                    break;
                }
                output.state.memory[address] = 0;
                words.push_back(0);
            }
            output.sourceMap.add({line.line, line.address, words, line.source, line.label, opcode});
        }
    }

    return ok;
}

}  // namespace casl
