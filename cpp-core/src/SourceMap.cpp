#include "SourceMap.hpp"

#include <utility>

namespace casl {

void SourceMap::add(SourceMapEntry entry) {
    const auto index = entries_.size();
    addressIndex_[entry.address] = index;
    entries_.push_back(std::move(entry));
}

const std::vector<SourceMapEntry>& SourceMap::entries() const {
    return entries_;
}

std::optional<int> SourceMap::lineForAddress(std::uint16_t address) const {
    const auto found = addressIndex_.find(address);
    if (found == addressIndex_.end()) return std::nullopt;
    return entries_[found->second].line;
}

std::optional<SourceMapEntry> SourceMap::entryForAddress(std::uint16_t address) const {
    const auto found = addressIndex_.find(address);
    if (found == addressIndex_.end()) return std::nullopt;
    return entries_[found->second];
}

void SourceMap::clear() {
    entries_.clear();
    addressIndex_.clear();
}

}  // namespace casl
