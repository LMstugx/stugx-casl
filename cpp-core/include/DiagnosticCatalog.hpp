#pragma once

#include <vector>
#include <string>

#include "CometState.hpp"

namespace casl {

void structureDiagnostic(Diagnostic& diagnostic);
void structureDiagnostics(std::vector<Diagnostic>& diagnostics);
void structureDiagnostics(std::vector<Diagnostic>& diagnostics, const std::string& source);

}  // namespace casl
