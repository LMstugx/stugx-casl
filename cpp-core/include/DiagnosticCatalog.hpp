#pragma once

#include <vector>

#include "CometState.hpp"

namespace casl {

void structureDiagnostic(Diagnostic& diagnostic);
void structureDiagnostics(std::vector<Diagnostic>& diagnostics);

}  // namespace casl
