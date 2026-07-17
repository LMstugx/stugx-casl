# Diagnostic Codes

- Audience: Users, test authors, and diagnostic maintainers
- Status: Canonical
- Last reviewed version: 0.1.0
- Classification: Canonical
- Related: [Diagnostics](../user/diagnostics.md), [Diagnostics and i18n](../developer/diagnostics-and-i18n.md)

Codes are stable technical identifiers. Display text is localized independently.

## Assembler

`missingStart`, `missingEnd`, `unknownOpcode`, `unknownSymbol`, `duplicateLabel`, `invalidRegister`, `invalidIndexRegister`, `malformedOperandList`, `invalidOperandCount`, `addressOutOfRange`, `literalOutOfRange`, `missingOpcode`, `invalidLiteral`, `missingOperand`, `unexpectedTrailingOperand`

## C++ Parser

`unexpectedToken`, `expectedToken`, `unterminatedBlock`, `missingSemicolon`, `invalidFunctionDeclaration`, `invalidParameterList`, `invalidVariableDeclaration`, `invalidAssignment`, `invalidIfStatement`, `invalidForStatement`, `invalidCallExpression`, `unsupportedExpression`, `unsupportedOperator`

## Semantic

`mainFunctionMissing`, `duplicateFunction`, `unknownFunction`, `unknownVariable`, `argumentCountMismatch`, `recursionUnsupported`, `breakOutsideLoop`, `continueOutsideLoop`, `parameterLocalConflict`, `unsupportedMainParameters`, `duplicateParameter`, `duplicateVariable`, `unsupportedInitializer`, `invalidCondition`, `integerLiteralOutOfRange`, `forwardDeclarationUnsupported`, `unsupportedDoubleArithmetic`, `unsupportedDoubleComparison`, `unsupportedDoubleParameter`, `unsupportedDoubleReturn`, `incompatibleScalarAssignment`, `invalidFloatingLiteral`, `floatingLiteralOutOfRange`, `unsupportedFloatingSuffix`, `unsupportedDoubleArray`

## Transpiler

`tooManyRegisterArguments`, `unsupportedCallArgument`, `unsupportedExpression`, `generatedLabelConflict`, `internalLoweringFailure`

## VM

`notLoaded`, `stepLimitReached`, `invalidInstruction`, `invalidMemoryAccess`, `stackUnderflow`, `stackOverflow`

Each code has an owning producer and parameter schema. A new code requires all locale resources, stable ranges/identity, tests, and an explicit baseline update.
