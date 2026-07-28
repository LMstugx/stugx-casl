#include "Assembler.hpp"
#include "DiagnosticCatalog.hpp"

#include <algorithm>
#include <charconv>
#include <cctype>
#include <set>
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

std::optional<std::int64_t> parseSignedDecimal(const std::string& text) {
    if (text.empty()) return std::nullopt;
    std::int64_t value = 0;
    const auto begin = text.data();
    const auto end = begin + text.size();
    const auto parsed = std::from_chars(begin, end, value, 10);
    if (parsed.ec != std::errc{} || parsed.ptr != end) return std::nullopt;
    return value;
}

std::optional<std::uint8_t> parseRegister(const std::string& token);

bool isCharacterConstant(const std::string& token) {
    return token.size() >= 2 && token.front() == '\'' && token.back() == '\'';
}

std::optional<std::vector<std::uint16_t>> characterConstantWords(const std::string& token) {
    if (!isCharacterConstant(token)) return std::nullopt;
    std::vector<std::uint16_t> words;
    for (std::size_t index = 1; index + 1 < token.size(); ++index) {
        const auto ch = static_cast<unsigned char>(token[index]);
        if (ch == '\'') {
            if (index + 2 >= token.size() || token[index + 1] != '\'') return std::nullopt;
            words.push_back(static_cast<std::uint16_t>('\''));
            ++index;
            continue;
        }
        if (ch >= 0x20 && ch <= 0x7e) {
            words.push_back(static_cast<std::uint16_t>(ch));
            continue;
        }
        if (ch == 0xef && index + 3 < token.size()) {
            const auto second = static_cast<unsigned char>(token[index + 1]);
            const auto third = static_cast<unsigned char>(token[index + 2]);
            const auto codePoint = static_cast<std::uint32_t>(
                ((ch & 0x0fU) << 12U) | ((second & 0x3fU) << 6U) | (third & 0x3fU)
            );
            if ((second & 0xc0U) == 0x80U && (third & 0xc0U) == 0x80U &&
                codePoint >= 0xff61U && codePoint <= 0xff9fU) {
                words.push_back(static_cast<std::uint16_t>(0xa1U + (codePoint - 0xff61U)));
                index += 2;
                continue;
            }
        }
        return std::nullopt;
    }
    if (words.empty()) return std::nullopt;
    return words;
}

std::optional<std::uint32_t> constantWordCount(const ParsedLine& line, std::vector<Diagnostic>& diagnostics) {
    if (line.operands.empty()) {
        diagnostics.push_back({line.line, Severity::Error, "Invalid numeric literal for DC: "});
        return std::nullopt;
    }
    std::uint32_t count = 0;
    for (const auto& operand : line.operands) {
        if (const auto characters = characterConstantWords(operand); characters.has_value()) {
            count += static_cast<std::uint32_t>(characters->size());
        } else {
            count += 1;
        }
    }
    return count;
}

std::optional<std::uint32_t> instructionSize(const ParsedLine& line, std::vector<Diagnostic>& diagnostics) {
    if (!line.opcode.has_value()) return 0;
    const auto opcode = *line.opcode;
    if (supportsRegisterForm(opcode) && line.operands.size() == 2 && parseRegister(line.operands[1]).has_value()) {
        return 1;
    }
    if (hasAddressOperand(opcode)) return 2;
    if (opcode == Opcode::NOP || opcode == Opcode::POP || opcode == Opcode::RET) return 1;
    if (opcode == Opcode::DC) return constantWordCount(line, diagnostics);
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
    bool inCharacterConstant = false;
    for (std::size_t index = 0; index < line.size(); ++index) {
        if (line[index] == '\'') {
            if (inCharacterConstant && index + 1 < line.size() && line[index + 1] == '\'') {
                ++index;
            } else {
                inCharacterConstant = !inCharacterConstant;
            }
        } else if (line[index] == ';' && !inCharacterConstant) {
            return line.substr(0, index);
        }
    }
    return line;
}

void trimRight(std::string& text) {
    while (!text.empty() && std::isspace(static_cast<unsigned char>(text.back())) != 0) {
        text.pop_back();
    }
}

bool hasMalformedComma(const std::string& rawLine) {
    auto text = stripCommentCopy(rawLine);
    trimRight(text);
    bool inCharacterConstant = false;
    std::optional<std::size_t> lastStructuralComma;
    for (std::size_t index = 0; index < text.size(); index += 1) {
        if (text[index] == '\'') {
            if (inCharacterConstant && index + 1 < text.size() && text[index + 1] == '\'') {
                ++index;
            } else {
                inCharacterConstant = !inCharacterConstant;
            }
            continue;
        }
        if (text[index] != ',' || inCharacterConstant) continue;
        lastStructuralComma = index;
        std::size_t next = index + 1;
        while (next < text.size() && std::isspace(static_cast<unsigned char>(text[next])) != 0) {
            next += 1;
        }
        if (next < text.size() && text[next] == ',') {
            return true;
        }
    }

    return lastStructuralComma.has_value() &&
           std::all_of(text.begin() + static_cast<std::ptrdiff_t>(*lastStructuralComma + 1), text.end(), [](unsigned char ch) {
               return std::isspace(ch) != 0;
           });
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
    const auto startCount = std::count_if(lines.begin(), lines.end(), [](const ParsedLine& line) {
        return line.opcode.has_value() && *line.opcode == Opcode::START;
    });
    const auto endCount = std::count_if(lines.begin(), lines.end(), [](const ParsedLine& line) {
        return line.opcode.has_value() && *line.opcode == Opcode::END;
    });
    const auto hasStart = startCount > 0;
    const auto hasEnd = endCount > 0;
    const auto line = lines.empty() ? 0 : lines.front().line;
    if (!hasStart) addDiagnostic(diagnostics, line, "CASL source must contain START directive");
    if (!hasEnd) addDiagnostic(diagnostics, line, "CASL source must contain END directive");
    if (startCount > 1) addDiagnostic(diagnostics, line, "START has too many occurrences");
    if (endCount > 1) addDiagnostic(diagnostics, line, "END has too many occurrences");
    const auto firstMeaningful = std::find_if(lines.begin(), lines.end(), [](const ParsedLine& item) {
        return item.opcode.has_value();
    });
    if (firstMeaningful != lines.end() && *firstMeaningful->opcode != Opcode::START) {
        addDiagnostic(diagnostics, firstMeaningful->line, "START must be the first instruction");
    }
    const auto end = std::find_if(lines.begin(), lines.end(), [](const ParsedLine& item) {
        return item.opcode.has_value() && *item.opcode == Opcode::END;
    });
    if (end != lines.end() && std::any_of(end + 1, lines.end(), [](const ParsedLine& item) { return item.opcode.has_value(); })) {
        addDiagnostic(diagnostics, (end + 1)->line, "END must be the final instruction");
    }
    return hasStart && hasEnd && startCount == 1 && endCount == 1 &&
           firstMeaningful != lines.end() && *firstMeaningful->opcode == Opcode::START &&
           (end == lines.end() || !std::any_of(end + 1, lines.end(), [](const ParsedLine& item) { return item.opcode.has_value(); }));
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

ParsedLine expandedLine(
    const ParsedLine& macro,
    Opcode opcode,
    std::vector<std::string> operands,
    bool carriesLabel
) {
    auto line = macro;
    line.label = carriesLabel ? macro.label : std::string{};
    line.opcode = opcode;
    line.opcodeText = opcodeName(opcode);
    line.operands = std::move(operands);
    return line;
}

bool expandMacrosAndLiterals(std::vector<ParsedLine>& lines, std::vector<Diagnostic>& diagnostics) {
    std::vector<ParsedLine> expanded;
    expanded.reserve(lines.size() + 24);
    bool ok = true;

    for (const auto& line : lines) {
        if (!line.opcode.has_value() || !isMacroOpcode(*line.opcode)) {
            expanded.push_back(line);
            continue;
        }

        const auto macro = *line.opcode;
        if ((macro == Opcode::RPUSH || macro == Opcode::RPOP) && !line.operands.empty()) {
            addDiagnostic(diagnostics, line.line, opcodeName(macro) + " has too many operands");
            ok = false;
            continue;
        }
        if ((macro == Opcode::IN || macro == Opcode::OUT) && line.operands.size() != 2) {
            addDiagnostic(diagnostics, line.line, opcodeName(macro) + " requires two address operands");
            ok = false;
            continue;
        }

        bool first = true;
        const auto append = [&](Opcode opcode, std::vector<std::string> operands) {
            expanded.push_back(expandedLine(line, opcode, std::move(operands), first));
            first = false;
        };

        if (macro == Opcode::RPUSH) {
            for (int registerIndex = 1; registerIndex <= 7; ++registerIndex) {
                append(Opcode::PUSH, {"0", "GR" + std::to_string(registerIndex)});
            }
        } else if (macro == Opcode::RPOP) {
            for (int registerIndex = 7; registerIndex >= 1; --registerIndex) {
                append(Opcode::POP, {"GR" + std::to_string(registerIndex)});
            }
        } else {
            append(Opcode::PUSH, {"0", "GR1"});
            append(Opcode::PUSH, {"0", "GR2"});
            append(Opcode::LAD, {"GR1", line.operands[0]});
            append(Opcode::LAD, {"GR2", line.operands[1]});
            append(Opcode::SVC, {macro == Opcode::IN ? "1" : "2"});
            append(Opcode::POP, {"GR2"});
            append(Opcode::POP, {"GR1"});
        }
    }

    std::set<std::string> usedLabels;
    for (const auto& line : expanded) {
        if (!line.label.empty()) usedLabels.insert(symbolKey(line.label));
    }

    std::vector<ParsedLine> literalLines;
    std::size_t literalIndex = 1;
    for (auto& line : expanded) {
        if (!line.opcode.has_value() || !hasAddressOperand(*line.opcode)) continue;
        const auto operandIndex = isRegisterAddressOpcode(*line.opcode) ? std::size_t{1} : std::size_t{0};
        if (line.operands.size() <= operandIndex) continue;
        auto& operand = line.operands[operandIndex];
        if (operand.size() < 2 || operand.front() != '=') continue;

        std::string generatedLabel;
        do {
            auto number = std::to_string(literalIndex++);
            generatedLabel = "STL" + std::string(5 - std::min<std::size_t>(5, number.size()), '0') + number;
        } while (usedLabels.find(symbolKey(generatedLabel)) != usedLabels.end());
        usedLabels.insert(symbolKey(generatedLabel));

        ParsedLine literal = line;
        literal.label = generatedLabel;
        literal.opcode = Opcode::DC;
        literal.opcodeText = "DC";
        literal.operands = {operand.substr(1)};
        literalLines.push_back(std::move(literal));
        operand = generatedLabel;
    }

    if (!literalLines.empty()) {
        const auto end = std::find_if(expanded.begin(), expanded.end(), [](const ParsedLine& line) {
            return line.opcode.has_value() && *line.opcode == Opcode::END;
        });
        expanded.insert(end, literalLines.begin(), literalLines.end());
    }

    lines = std::move(expanded);
    return ok;
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
    const auto expansionOk = expandMacrosAndLiterals(lines, result.diagnostics);
    const auto requiredDirectivesOk = validateRequiredDirectives(lines, result.diagnostics);
    const auto parseOk = parsed.ok && expansionOk && requiredDirectivesOk;
    const auto pass1Ok = parseOk && pass1(lines, result.value, result.diagnostics);
    const auto pass2Ok = pass1Ok && pass2(lines, result.value, result.diagnostics);

    structureDiagnostics(result.diagnostics, source);
    result.ok = parseOk && pass1Ok && pass2Ok && result.diagnostics.empty();
    result.value.state.runState = result.ok ? RunState::Ready : RunState::Error;
    result.value.state.visualPath = result.ok ? VisualPathKind::Ready_PrToMar : VisualPathKind::None;
    result.value.state.pr = result.value.entryPoint;
    result.value.state.mar = result.value.entryPoint;
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

    const auto start = std::find_if(lines.begin(), lines.end(), [](const ParsedLine& line) {
        return line.opcode.has_value() && *line.opcode == Opcode::START;
    });
    if (start != lines.end()) {
        if (start->operands.size() > 1) {
            addDiagnostic(diagnostics, start->line, "START has too many operands");
            ok = false;
        } else if (!start->operands.empty()) {
            const auto entryPoint = resolveAddressOperand(start->operands.front(), output.symbols, diagnostics, start->line);
            if (!entryPoint.has_value()) {
                ok = false;
            } else {
                output.entryPoint = *entryPoint;
                output.state.pr = *entryPoint;
                output.state.mar = *entryPoint;
            }
        }
    }

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
            const auto sourceRegister = supportsRegisterForm(opcode) && line.operands.size() == 2
                ? parseRegister(line.operands[1])
                : std::optional<std::uint8_t>{};
            if (sourceRegister.has_value()) {
                const auto machine = encodeInstruction(opcode, *gr, *sourceRegister, true);
                output.state.memory[line.address] = machine;
                output.sourceMap.add({line.line, line.address, {machine}, line.source, line.label, opcode});
                output.instructions.push_back({
                    line.address,
                    line.line,
                    opcode,
                    line.source,
                    *gr,
                    *sourceRegister,
                    std::nullopt,
                    line.operands[1],
                    0,
                    1
                });
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
            output.instructions.push_back({line.address, line.line, opcode, line.source, *gr, std::nullopt, *operandAddress, line.operands[1], indexRegister, 2});
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
            output.instructions.push_back({line.address, line.line, opcode, line.source, 0, std::nullopt, *operandAddress, line.operands[0], indexRegister, 2});
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
            output.instructions.push_back({line.address, line.line, opcode, line.source, 0, std::nullopt, *operandAddress, line.operands[0], indexRegister, 2});
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
            output.instructions.push_back({line.address, line.line, opcode, line.source, 0, std::nullopt, *operandAddress, line.operands[0], indexRegister, 2});
            continue;
        }

        if (opcode == Opcode::SVC) {
            if (line.operands.empty()) {
                addDiagnostic(diagnostics, line.line, "SVC requires an address operand");
                ok = false;
                continue;
            }
            if (line.operands.size() > 2) {
                addDiagnostic(diagnostics, line.line, "SVC has too many operands");
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
            output.instructions.push_back({line.address, line.line, opcode, line.source, 0, std::nullopt, *operandAddress, line.operands[0], indexRegister, 2});
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
            output.instructions.push_back({line.address, line.line, opcode, line.source, *gr, std::nullopt, std::nullopt, {}, 0, 1});
            continue;
        }

        if (opcode == Opcode::NOP || opcode == Opcode::RET) {
            const auto machine = encodeInstruction(opcode, 0);
            output.state.memory[line.address] = machine;
            output.sourceMap.add({line.line, line.address, {machine}, line.source, line.label, opcode});
            output.instructions.push_back({line.address, line.line, opcode, line.source, 0, std::nullopt, std::nullopt, {}, 0, 1});
            continue;
        }

        if (opcode == Opcode::DC) {
            std::vector<std::uint16_t> words;
            for (const auto& token : line.operands) {
                if (const auto characters = characterConstantWords(token); characters.has_value()) {
                    words.insert(words.end(), characters->begin(), characters->end());
                    continue;
                }
                if (!token.empty() && token.front() == '\'') {
                    addDiagnostic(diagnostics, line.line, "Invalid numeric literal for DC: " + token);
                    ok = false;
                    continue;
                }
                if (const auto decimal = parseSignedDecimal(token); decimal.has_value()) {
                    words.push_back(static_cast<std::uint16_t>(static_cast<std::uint64_t>(*decimal) & 0xffffU));
                    continue;
                }
                if (const auto numeric = parseNumber(token); numeric.has_value() && *numeric <= 0xffff) {
                    words.push_back(static_cast<std::uint16_t>(*numeric));
                    continue;
                }
                const auto symbol = output.symbols.find(symbolKey(token));
                if (symbol != output.symbols.end()) {
                    words.push_back(symbol->second);
                    continue;
                }
                addDiagnostic(diagnostics, line.line, "Invalid numeric literal for DC: " + token);
                ok = false;
            }
            for (std::size_t index = 0; index < words.size(); index += 1) {
                const auto address = static_cast<std::uint32_t>(line.address) + index;
                if (!isAddressInRange(address)) {
                    addDiagnostic(diagnostics, line.line, "DC address out of range");
                    ok = false;
                    continue;
                }
                output.state.memory[address] = words[index];
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
