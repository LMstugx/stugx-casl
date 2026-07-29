import type { DiagnosticCode, DiagnosticParamValue } from "./types";

export type DiagnosticParamType = "string" | "number" | "boolean" | "string-or-number";
export interface DiagnosticSchema {
  required: Readonly<Record<string, DiagnosticParamType>>;
  optional: Readonly<Record<string, DiagnosticParamType>>;
}

const none = Object.freeze({});
export const diagnosticSchemas = {
  "assembler.missingStart": { required: none, optional: none },
  "assembler.missingEnd": { required: none, optional: none },
  "assembler.unknownOpcode": { required: { opcode: "string" }, optional: { line: "number" } },
  "assembler.unknownSymbol": { required: { symbol: "string" }, optional: { line: "number" } },
  "assembler.duplicateLabel": { required: { label: "string" }, optional: { firstLine: "number", duplicateLine: "number" } },
  "assembler.invalidRegister": { required: { register: "string" }, optional: none },
  "assembler.invalidIndexRegister": { required: { indexRegister: "string" }, optional: none },
  "assembler.malformedOperandList": { required: none, optional: none },
  "assembler.invalidOperandCount": { required: { mnemonic: "string" }, optional: { expectedCount: "number", actualCount: "number" } },
  "assembler.addressOutOfRange": { required: none, optional: { value: "string-or-number", minimum: "number", maximum: "number" } },
  "assembler.literalOutOfRange": { required: none, optional: { value: "string-or-number", minimum: "number", maximum: "number" } },
  "assembler.missingOpcode": { required: none, optional: { label: "string" } },
  "assembler.invalidLiteral": { required: { literal: "string" }, optional: none },
  "assembler.missingOperand": { required: { mnemonic: "string" }, optional: none },
  "assembler.unexpectedTrailingOperand": { required: { mnemonic: "string", operand: "string" }, optional: none },
  "linker.invalidProjectIdentity": { required: none, optional: none },
  "linker.invalidModuleOrder": { required: none, optional: { moduleId: "string", moduleCount: "number" } },
  "linker.missingMainModule": { required: none, optional: { moduleId: "string" } },
  "linker.invalidProgramName": { required: { moduleId: "string" }, optional: none },
  "linker.duplicateExportedProgram": { required: { symbol: "string" }, optional: none },
  "linker.unresolvedExternalSymbol": { required: { symbol: "string" }, optional: none },
  "linker.duplicateRelocationTarget": { required: { address: "number" }, optional: none },
  "linker.relocationOverflow": { required: { symbol: "string" }, optional: none },
  "linker.projectMemoryOverflow": { required: { moduleId: "string", wordCount: "number" }, optional: none },
  "linker.moduleAssemblyNotReady": { required: { moduleId: "string" }, optional: none },
  "linker.staleModuleAssembly": { required: { moduleId: "string" }, optional: none },
  "linker.linkedImageStale": { required: { reason: "string" }, optional: none },
  "cppParser.unexpectedToken": { required: { token: "string" }, optional: { expected: "string" } },
  "cppParser.expectedToken": { required: { expectedToken: "string" }, optional: { actualToken: "string" } },
  "cppParser.unterminatedBlock": { required: none, optional: { construct: "string" } },
  "cppParser.missingSemicolon": { required: none, optional: none },
  "cppParser.invalidFunctionDeclaration": { required: none, optional: { token: "string" } },
  "cppParser.invalidParameterList": { required: none, optional: { token: "string" } },
  "cppParser.invalidVariableDeclaration": { required: none, optional: { token: "string" } },
  "cppParser.invalidAssignment": { required: none, optional: { token: "string" } },
  "cppParser.invalidIfStatement": { required: none, optional: { token: "string" } },
  "cppParser.invalidForStatement": { required: none, optional: { token: "string" } },
  "cppParser.invalidCallExpression": { required: none, optional: { token: "string" } },
  "cppParser.unsupportedExpression": { required: { token: "string" }, optional: none },
  "cppParser.unsupportedOperator": { required: { operator: "string" }, optional: { construct: "string" } },
  "semantic.mainFunctionMissing": { required: none, optional: none },
  "semantic.duplicateFunction": { required: { function: "string" }, optional: { firstLine: "number", duplicateLine: "number" } },
  "semantic.unknownFunction": { required: { function: "string" }, optional: none },
  "semantic.unknownVariable": { required: { variable: "string" }, optional: { function: "string" } },
  "semantic.argumentCountMismatch": { required: { function: "string", expectedCount: "number", actualCount: "number" }, optional: none },
  "semantic.recursionUnsupported": { required: { function: "string" }, optional: none },
  "semantic.breakOutsideLoop": { required: none, optional: none },
  "semantic.continueOutsideLoop": { required: none, optional: none },
  "semantic.parameterLocalConflict": { required: { variable: "string" }, optional: { function: "string", parameterLine: "number", localLine: "number" } },
  "semantic.unsupportedMainParameters": { required: { actualCount: "number" }, optional: none },
  "semantic.duplicateParameter": { required: { variable: "string" }, optional: { function: "string" } },
  "semantic.duplicateVariable": { required: { variable: "string" }, optional: { function: "string" } },
  "semantic.unsupportedInitializer": { required: { variable: "string" }, optional: none },
  "semantic.invalidCondition": { required: { construct: "string" }, optional: none },
  "semantic.integerLiteralOutOfRange": { required: { literal: "string" }, optional: none },
  "semantic.forwardDeclarationUnsupported": { required: { function: "string" }, optional: none },
  "semantic.unsupportedDoubleArithmetic": { required: { operator: "string" }, optional: none },
  "semantic.unsupportedDoubleComparison": { required: { operator: "string" }, optional: none },
  "semantic.unsupportedDoubleParameter": { required: { function: "string", parameter: "string" }, optional: none },
  "semantic.unsupportedDoubleReturn": { required: { function: "string" }, optional: none },
  "semantic.incompatibleScalarAssignment": { required: { variable: "string", fromType: "string", toType: "string" }, optional: none },
  "semantic.invalidFloatingLiteral": { required: { literal: "string" }, optional: none },
  "semantic.floatingLiteralOutOfRange": { required: { literal: "string" }, optional: none },
  "semantic.unsupportedFloatingSuffix": { required: { literal: "string", suffix: "string" }, optional: none },
  "semantic.unsupportedDoubleArray": { required: { variable: "string" }, optional: none },
  "transpiler.tooManyRegisterArguments": { required: { function: "string", maximum: "number" }, optional: { actualCount: "number" } },
  "transpiler.unsupportedCallArgument": { required: { argumentCount: "number" }, optional: { function: "string" } },
  "transpiler.unsupportedExpression": { required: { construct: "string" }, optional: none },
  "transpiler.generatedLabelConflict": { required: { function: "string", label: "string" }, optional: none },
  "transpiler.internalLoweringFailure": { required: none, optional: none },
  "vm.notLoaded": { required: none, optional: none },
  "vm.stepLimitReached": { required: { stepLimit: "number" }, optional: none },
  "vm.invalidInstruction": { required: none, optional: { address: "number" } },
  "vm.invalidMemoryAccess": { required: { address: "number" }, optional: none },
  "vm.stackUnderflow": { required: none, optional: none },
  "vm.stackOverflow": { required: none, optional: none }
} as const satisfies Record<DiagnosticCode, DiagnosticSchema>;

export function getDiagnosticTemplateSchema(code: DiagnosticCode): DiagnosticSchema {
  return diagnosticSchemas[code];
}

export function matchesParamType(value: DiagnosticParamValue, type: DiagnosticParamType): boolean {
  if (type === "string-or-number") return typeof value === "string" || typeof value === "number";
  return typeof value === type;
}
