#include "Format.hpp"

#include <array>

namespace casl {

std::string formatHex16(std::uint16_t value) {
    constexpr std::array<char, 16> digits{'0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'A', 'B', 'C', 'D', 'E', 'F'};
    std::string text(4, '0');
    text[0] = digits[(value >> 12) & 0x0f];
    text[1] = digits[(value >> 8) & 0x0f];
    text[2] = digits[(value >> 4) & 0x0f];
    text[3] = digits[value & 0x0f];
    return text;
}

}  // namespace casl
