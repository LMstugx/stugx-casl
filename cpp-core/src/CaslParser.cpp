#include "CaslParser.hpp"

#include <algorithm>
#include <cctype>
#include <sstream>
#include <string_view>

namespace casl {
namespace {

bool isSeparator(char ch) {
    return ch == ',' || std::isspace(static_cast<unsigned char>(ch)) != 0;
}

std::string_view trimView(std::string_view value) {
    while (!value.empty() && std::isspace(static_cast<unsigned char>(value.front())) != 0) {
        value.remove_prefix(1);
    }
    while (!value.empty() && std::isspace(static_cast<unsigned char>(value.back())) != 0) {
        value.remove_suffix(1);
    }
    return value;
}

std::string upperCopy(std::string_view value) {
    std::string copy(value);
    std::transform(copy.begin(), copy.end(), copy.begin(), [](unsigned char ch) {
        return static_cast<char>(std::toupper(ch));
    });
    return copy;
}

std::string_view stripCommentView(std::string_view line) {
    const auto comment = line.find(';');
    return trimView(line.substr(0, comment));
}

std::vector<std::string_view> tokenizeViews(std::string_view source) {
    std::vector<std::string_view> tokens;
    std::size_t index = 0;
    while (index < source.size()) {
        while (index < source.size() && isSeparator(source[index])) {
            index += 1;
        }
        const auto begin = index;
        while (index < source.size() && !isSeparator(source[index])) {
            index += 1;
        }
        if (begin < index) {
            tokens.push_back(source.substr(begin, index - begin));
        }
    }
    return tokens;
}

void copyOperands(std::vector<std::string>& target, std::vector<std::string_view>::const_iterator begin, std::vector<std::string_view>::const_iterator end) {
    target.clear();
    target.reserve(static_cast<std::size_t>(end - begin));
    for (auto iterator = begin; iterator != end; ++iterator) {
        target.emplace_back(*iterator);
    }
}

}  // namespace

Result<std::vector<ParsedLine>> CaslParser::parse(const std::string& source) const {
    Result<std::vector<ParsedLine>> result;
    result.ok = true;

    std::istringstream input(source);
    std::string rawLine;
    int lineNumber = 0;

    while (std::getline(input, rawLine)) {
        lineNumber += 1;
        const auto stripped = stripCommentView(rawLine);
        if (stripped.empty()) continue;

        auto tokens = tokenizeViews(stripped);
        if (tokens.empty()) continue;

        ParsedLine line;
        line.line = lineNumber;
        line.raw = rawLine;
        line.source = std::string(stripped);

        const auto firstOpcode = parseOpcode(tokens[0]);
        if (firstOpcode.has_value()) {
            line.opcode = firstOpcode;
            line.opcodeText = upperCopy(tokens[0]);
            copyOperands(line.operands, tokens.begin() + 1, tokens.end());
        } else {
            line.label = std::string(tokens[0]);
            if (tokens.size() < 2) {
                result.ok = false;
                result.diagnostics.push_back({lineNumber, Severity::Error, "Missing opcode after label"});
                result.value.push_back(std::move(line));
                continue;
            }

            const auto opcode = parseOpcode(tokens[1]);
            line.opcode = opcode;
            line.opcodeText = upperCopy(tokens[1]);
            copyOperands(line.operands, tokens.begin() + 2, tokens.end());

            if (!opcode.has_value()) {
                result.ok = false;
                result.diagnostics.push_back({lineNumber, Severity::Error, "Unknown opcode: " + std::string(tokens[1])});
            }
        }

        result.value.push_back(std::move(line));
    }

    return result;
}

}  // namespace casl
