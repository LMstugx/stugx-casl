#pragma once

#include <cstdint>
#include <optional>
#include <string>
#include <unordered_map>
#include <vector>

#include "InstructionSet.hpp"

namespace casl {

struct SourceMapEntry {
    int line = 0;
    std::uint16_t address = 0;
    std::vector<std::uint16_t> machineWords;
    std::string source;
    std::string label;
    Opcode instruction = Opcode::DC;
};

class SourceMap {
public:
    void add(SourceMapEntry entry);
    [[nodiscard]] const std::vector<SourceMapEntry>& entries() const;
    [[nodiscard]] std::optional<int> lineForAddress(std::uint16_t address) const;
    [[nodiscard]] std::optional<SourceMapEntry> entryForAddress(std::uint16_t address) const;
    void clear();

private:
    std::vector<SourceMapEntry> entries_;
    std::unordered_map<std::uint16_t, std::size_t> addressIndex_;
};

}  // namespace casl
