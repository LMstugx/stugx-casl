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
    if (hasAddressOperand(opcode)) return 2;
    if (opcode == Opcode::NOP || opcode == Opcode::POP || opcode == Opcode::RET) return 1;
    if (opcode == Opcode::DC) return static_cast<std::uint32_t>(std::max<std::size_t>(1, line.operands.size()));
    if (opcode == Opcode::DS) {
        const auto count = parseNumber(line.operands.empty() ? "0" : line.operands[0]);
        if (!count.has_value()) {
            diagnostics.push_back({line.line, Severity::Error, "Invalid numeric literal for DS: " + (line.operands.empty() ? std::string{} : line.operands[0])});
            return std::nullopt;
        }
        return *count;
    }
    return 0;
}

void addDiagnostic(std::vector<Diagnostic>& diagnostics, int line, std::string message);

std::optional<std::uint8_t> parseRegister(const std::string& token) {
    if (token.size() != 3) return std::nullopt;
    if (token[0] != 'G' && token[0] != 'g') return std::nullopt;
    if (token[1] != 'R' && token[1] != 'r') return std::nullopt;
    if (token[2] < '0' || token[2] > '7') return std::nullopt;
    return static_cast<std::uint8_t>(token[2] - '0');
}

std::optional<std::uint8_t> parseIndexRegister(const std::string& token, std::vector<Diagnostic>& diagnostics, int line) {
    const auto reg = parseRegister(token);
    if (!reg.has_value()) {
        addDiagnostic(diagnostics, line, "Invalid index register: " + token);
        return std::nullopt;
    }
    if (*reg == 0) {
        addDiagnostic(diagnostics, line, "GR0 cannot be used as an index register");
        return std::nullopt;
    }
    return reg;
}

void addDiagnostic(std::vector<Diagnostic>& diagnostics, int line, std::string message) {
    diagnostics.push_back({line, Severity::Error, std::move(message)});
}

std::string stripCommentCopy(const std::string& line) {
    const auto comment = line.find(';');
    return comment == std::string::npos ? line : line.substr(0, comment);
}

void trimRight(std::string& text) {
    while (!text.empty() && std::isspace(static_cast<unsigned char>(text.back())) != 0) {
        text.pop_back();
    }
}

bool hasMalformedComma(const std::string& rawLine) {
    auto text = stripCommentCopy(rawLine);
    trimRight(text);
    if (!text.empty() && text.back() == ',') {
        return true;
    }

    for (std::size_t index = 0; index < text.size(); index += 1) {
        if (text[index] != ',') continue;
        std::size_t next = index + 1;
        while (next < text.size() && std::isspace(static_cast<unsigned char>(text[next])) != 0) {
            next += 1;
        }
        if (next < text.size() && text[next] == ',') {
            return true;
        }
    }

    return false;
}

std::vector<Diagnostic> collectMalformedCommaDiagnostics(const std::string& source) {
    std::vector<Diagnostic> diagnostics;
    std::size_t lineStart = 0;
    int lineNumber = 1;

    while (lineStart <= source.size()) {
        const auto lineEnd = source.find('\n', lineStart);
        const auto count = lineEnd == std::string::npos ? source.size() - lineStart : lineEnd - lineStart;
        const auto rawLine = source.substr(lineStart, count);
        if (hasMalformedComma(rawLine)) {
            diagnostics.push_back({lineNumber, Severity::Error, "Malformed operand list near comma"});
        }
        if (lineEnd == std::string::npos) break;
        lineStart = lineEnd + 1;
        lineNumber += 1;
    }

    return diagnostics;
}

bool validateRequiredDirectives(const std::vector<ParsedLine>& lines, std::vector<Diagnostic>& diagnostics) {
    const auto hasStart = std::any_of(lines.begin(), lines.end(), [](const ParsedLine& line) {
        return line.opcode.has_value() && *line.opcode == Opcode::START;
    });
    const auto hasEnd = std::any_of(lines.begin(), lines.end(), [](const ParsedLine& line) {
        return line.opcode.has_value() && *line.opcode == Opcode::END;
    });
    const auto line = lines.empty() ? 0 : lines.front().line;
    if (!hasStart) addDiagnostic(diagnostics, line, "CASL source must contain START directive");
    if (!hasEnd) addDiagnostic(diagnostics, line, "CASL source must contain END directive");
    return hasStart && hasEnd;
}

std::string symbolKey(const std::string& label) {
    std::string key(label);
    std::transform(key.begin(), key.end(), key.begin(), [](unsigned char ch) {
        return static_cast<char>(std::toupper(ch));
    });
    return key;
}

bool isRegisterAddressOpcode(Opcode opcode) {
    return opcode == Opcode::LD || opcode == Opcode::LAD || opcode == Opcode::ADDA ||
           opcode == Opcode::SUBA || opcode == Opcode::ADDL || opcode == Opcode::SUBL ||
           opcode == Opcode::AND || opcode == Opcode::OR || opcode == Opcode::XOR ||
           opcode == Opcode::CPA || opcode == Opcode::CPL || opcode == Opcode::SLA ||
           opcode == Opcode::SRA || opcode == Opcode::SLL || opcode == Opcode::SRL ||
           opcode == Opcode::ST;
}

bool isJumpOpcode(Opcode opcode) {
    return opcode == Opcode::JUMP || opcode == Opcode::JZE || opcode == Opcode::JNZ ||
           opcode == Opcode::JPL || opcode == Opcode::JMI || opcode == Opcode::JOV;
}

bool isPushOpcode(Opcode opcode) {
    return opcode == Opcode::PUSH;
}

bool isPopOpcode(Opcode opcode) {
    return opcode == Opcode::POP;
}

bool isCallOpcode(Opcode opcode) {
    return opcode == Opcode::CALL;
}

std::optional<std::uint16_t> resolveAddressOperand(
    const std::string& token,
    const std::unordered_map<std::string, std::uint16_t>& symbols,
    std::vector<Diagnostic>& diagnostics,
    int line
) {
    const auto numeric = parseNumber(token);
    if (numeric.has_value()) {
        if (*numeric > 0xffff) {
            addDiagnostic(diagnostics, line, "Address operand out of 16-bit range: " + token);
            return std::nullopt;
        }
        return static_cast<std::uint16_t>(*numeric);
    }

    const auto symbol = symbols.find(symbolKey(token));
    if (symbol == symbols.end()) {
        addDiagnostic(diagnostics, line, "Undefined label: " + token);
        return std::nullopt;
    }
    return symbol->second;
}

}  // namespace

AssembleResult Assembler::assemble(const std::string& source) const {
    AssembleResult result;
    CaslParser parser;
    auto parsed = parser.parse(source);
    result.diagnostics = parsed.diagnostics;
    auto commaDiagnostics = collectMalformedCommaDiagnostics(source);
    if (!commaDiagnostics.empty()) {
        parsed.ok = false;
        result.diagnostics.insert(result.diagnostics.end(), commaDiagnostics.begin(), commaDiagnostics.end());
    }

    auto lines = std::move(parsed.value);
    const auto requiredDirectivesOk = validateRequiredDirectives(lines, result.diagnostics);
    const auto parseOk = parsed.ok && requiredDirectivesOk;
    const auto pass1Ok = parseOk && pass1(lines, result.value, result.diagnostics);
    const auto pass2Ok = pass1Ok && pass2(lines, result.value, result.diagnostics);

    result.ok = parseOk && pass1Ok && pass2Ok && result.diagnostics.empty();
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
            if (opcode != Opcode::END && address >= kMemorySize) {
                line.address = 0xffff;
                addDiagnostic(diagnostics, line.line, "Program memory exceeds 0xFFFF");
                ok = false;
                continue;
            }
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

        if (isRegisterAddressOpcode(opcode)) {
            if (line.operands.size() < 2) {
                addDiagnostic(diagnostics, line.line, opcodeName(opcode) + " requires register and address operands");
                ok = false;
                continue;
            }
            if (line.operands.size() > 3) {
                addDiagnostic(diagnostics, line.line, opcodeName(opcode) + " has too many operands");
                ok = false;
                continue;
            }

            const auto gr = parseRegister(line.operands[0]);
            if (!gr.has_value()) {
                addDiagnostic(diagnostics, line.line, "Invalid register: " + line.operands[0]);
                ok = false;
                continue;
            }
            std::uint8_t indexRegister = 0;
            if (line.operands.size() == 3) {
                const auto parsedIndex = parseIndexRegister(line.operands[2], diagnostics, line.line);
                if (!parsedIndex.has_value()) {
                    ok = false;
                    continue;
                }
                indexRegister = *parsedIndex;
            }

            const auto operandAddress = resolveAddressOperand(line.operands[1], output.symbols, diagnostics, line.line);
            if (!operandAddress.has_value()) {
                ok = false;
                continue;
            }

            const auto machine = encodeInstruction(opcode, *gr, indexRegister);
            output.state.memory[line.address] = machine;
            output.state.memory[static_cast<std::uint16_t>(line.address + 1)] = *operandAddress;
            output.sourceMap.add({line.line, line.address, {machine, *operandAddress}, line.source, line.label, opcode});
            output.instructions.push_back({line.address, line.line, opcode, line.source, *gr, *operandAddress, line.operands[1], indexRegister, 2});
            continue;
        }

        if (isJumpOpcode(opcode)) {
            if (line.operands.empty()) {
                addDiagnostic(diagnostics, line.line, opcodeName(opcode) + " requires an address operand");
                ok = false;
                continue;
            }
            if (line.operands.size() > 2) {
                addDiagnostic(diagnostics, line.line, opcodeName(opcode) + " has too many operands");
                ok = false;
                continue;
            }
            std::uint8_t indexRegister = 0;
            if (line.operands.size() == 2) {
                const auto parsedIndex = parseIndexRegister(line.operands[1], diagnostics, line.line);
                if (!parsedIndex.has_value()) {
                    ok = false;
                    continue;
                }
                indexRegister = *parsedIndex;
            }

            const auto operandAddress = resolveAddressOperand(line.operands[0], output.symbols, diagnostics, line.line);
            if (!operandAddress.has_value()) {
                ok = false;
                continue;
            }

            const auto machine = encodeInstruction(opcode, 0, indexRegister);
            output.state.memory[line.address] = machine;
            output.state.memory[static_cast<std::uint16_t>(line.address + 1)] = *operandAddress;
            output.sourceMap.add({line.line, line.address, {machine, *operandAddress}, line.source, line.label, opcode});
            output.instructions.push_back({line.address, line.line, opcode, line.source, 0, *operandAddress, line.operands[0], indexRegister, 2});
            continue;
        }

        if (isPushOpcode(opcode)) {
            if (line.operands.empty()) {
                addDiagnostic(diagnostics, line.line, "PUSH requires an address operand");
                ok = false;
                continue;
            }
            if (line.operands.size() > 2) {
                addDiagnostic(diagnostics, line.line, "PUSH has too many operands");
                ok = false;
                continue;
            }
            std::uint8_t indexRegister = 0;
            if (line.operands.size() == 2) {
                const auto parsedIndex = parseIndexRegister(line.operands[1], diagnostics, line.line);
                if (!parsedIndex.has_value()) {
                    ok = false;
                    continue;
                }
                indexRegister = *parsedIndex;
            }

            const auto operandAddress = resolveAddressOperand(line.operands[0], output.symbols, diagnostics, line.line);
            if (!operandAddress.has_value()) {
                ok = false;
                continue;
            }

            const auto machine = encodeInstruction(opcode, 0, indexRegister);
            output.state.memory[line.address] = machine;
            output.state.memory[static_cast<std::uint16_t>(line.address + 1)] = *operandAddress;
            output.sourceMap.add({line.line, line.address, {machine, *operandAddress}, line.source, line.label, opcode});
            output.instructions.push_back({line.address, line.line, opcode, line.source, 0, *operandAddress, line.operands[0], indexRegister, 2});
            continue;
        }

        if (isCallOpcode(opcode)) {
            if (line.operands.empty()) {
                addDiagnostic(diagnostics, line.line, "CALL requires an address operand");
                ok = false;
                continue;
            }
            if (line.operands.size() > 2) {
                addDiagnostic(diagnostics, line.line, "CALL has too many operands");
                ok = false;
                continue;
            }
            std::uint8_t indexRegister = 0;
            if (line.operands.size() == 2) {
                const auto parsedIndex = parseIndexRegister(line.operands[1], diagnostics, line.line);
                if (!parsedIndex.has_value()) {
                    ok = false;
                    continue;
                }
                indexRegister = *parsedIndex;
            }

            const auto operandAddress = resolveAddressOperand(line.operands[0], output.symbols, diagnostics, line.line);
            if (!operandAddress.has_value()) {
                ok = false;
                continue;
            }

            const auto machine = encodeInstruction(opcode, 0, indexRegister);
            output.state.memory[line.address] = machine;
            output.state.memory[static_cast<std::uint16_t>(line.address + 1)] = *operandAddress;
            output.sourceMap.add({line.line, line.address, {machine, *operandAddress}, line.source, line.label, opcode});
            output.instructions.push_back({line.address, line.line, opcode, line.source, 0, *operandAddress, line.operands[0], indexRegister, 2});
            continue;
        }

        if (isPopOpcode(opcode)) {
            if (line.operands.empty()) {
                addDiagnostic(diagnostics, line.line, "POP requires a register operand");
                ok = false;
                continue;
            }
            if (line.operands.size() > 1) {
                addDiagnostic(diagnostics, line.line, "POP does not support index operands");
                ok = false;
                continue;
            }

            const auto gr = parseRegister(line.operands[0]);
            if (!gr.has_value()) {
                addDiagnostic(diagnostics, line.line, "Invalid register: " + line.operands[0]);
                ok = false;
                continue;
            }

            const auto machine = encodeInstruction(opcode, *gr, 0);
            output.state.memory[line.address] = machine;
            output.sourceMap.add({line.line, line.address, {machine}, line.source, line.label, opcode});
            output.instructions.push_back({line.address, line.line, opcode, line.source, *gr, std::nullopt, {}, 0, 1});
            continue;
        }

        if (opcode == Opcode::NOP || opcode == Opcode::RET) {
            const auto machine = encodeInstruction(opcode, 0);
            output.state.memory[line.address] = machine;
            output.sourceMap.add({line.line, line.address, {machine}, line.source, line.label, opcode});
            output.instructions.push_back({line.address, line.line, opcode, line.source, 0, std::nullopt, {}, 0, 1});
            continue;
        }

        if (opcode == Opcode::DC) {
            const auto hasIndexLikeOperand = std::any_of(line.operands.begin() + std::min<std::size_t>(1, line.operands.size()), line.operands.end(), [](const std::string& operand) {
                return parseRegister(operand).has_value();
            });
            if (hasIndexLikeOperand) {
                addDiagnostic(diagnostics, line.line, "DC does not support index operands");
                ok = false;
                continue;
            }
            const auto count = std::max<std::size_t>(1, line.operands.size());
            std::vector<std::uint16_t> words;
            words.reserve(count);
            for (std::size_t index = 0; index < count; index += 1) {
                const auto token = line.operands.empty() ? "0" : line.operands[index];
                const auto value = parseNumber(token);
                if (!value.has_value()) {
                    addDiagnostic(diagnostics, line.line, "Invalid numeric literal for DC: " + token);
                    ok = false;
                    continue;
                }
                if (*value > 0xffff) {
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
            if (line.operands.size() > 1) {
                addDiagnostic(diagnostics, line.line, "DS does not support index operands");
                ok = false;
                continue;
            }
            const auto count = parseNumber(line.operands.empty() ? "0" : line.operands[0]);
            if (!count.has_value()) {
                addDiagnostic(diagnostics, line.line, "Invalid numeric literal for DS: " + (line.operands.empty() ? std::string{} : line.operands[0]));
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
