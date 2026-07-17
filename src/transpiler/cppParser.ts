import type { Diagnostic } from "../core/types";
import { createStructuredDiagnostic } from "../diagnostics/catalog";
import type { DiagnosticCode, DiagnosticParams } from "../diagnostics/types";
import type {
  CppAssignment,
  CppBreakStatement,
  CppCallExpression,
  CppBinaryExpression,
  CppCondition,
  CppContinueStatement,
  CppConditionOperator,
  CppDoubleLiteral,
  CppExpression,
  CppForStatement,
  CppFunction,
  CppIfStatement,
  CppIntegerLiteral,
  CppParameter,
  CppProgram,
  CppReturn,
  CppStatement,
  CppVarDecl,
  CppWhileStatement
} from "./cppAst";
import { CppToken, lexCpp } from "./cppLexer";
import { encodeNumberToBinary64 } from "./doubleRepresentation";
import type { CppScalarType } from "./cppScalarTypes";

export interface ParseResult {
  program: CppProgram | null;
  diagnostics: Diagnostic[];
}

export function parseCpp(source: string): ParseResult {
  const lexed = lexCpp(source);
  const parser = new Parser(lexed.tokens, lexed.diagnostics);
  return parser.parseProgram();
}

class Parser {
  private index = 0;

  constructor(
    private readonly tokens: CppToken[],
    private readonly diagnostics: Diagnostic[]
  ) {}

  parseProgram(): ParseResult {
    const functions: CppFunction[] = [];
    while (!this.is("eof")) {
      const before = this.index;
      const fn = this.parseFunctionDeclaration();
      if (fn) {
        functions.push(fn);
        continue;
      }
      this.synchronize();
      if (this.index === before && !this.is("eof")) this.advance();
    }
    const main = functions.find((fn) => fn.name === "main") ?? null;
    return {
      program: main ? { kind: "Program", functions, main } : functions.length > 0 ? ({ kind: "Program", functions, main: functions[0] } as CppProgram) : null,
      diagnostics: this.diagnostics
    };
  }

  private parseFunctionDeclaration(): CppFunction | null {
    const start = this.current();
    const returnType = this.parseScalarType();
    if (!returnType) {
      this.error(start, "Current C++ subset only supports int function declarations, plus the explicitly restricted double storage subset.", "cppParser.invalidFunctionDeclaration", { token: this.tokenText(start) });
      return null;
    }

    if (this.matchSymbol("*")) {
      this.error(this.previous(), "Current C++ subset does not support pointer return types.", "cppParser.invalidFunctionDeclaration", { token: "*" });
      return null;
    }

    const name = this.consume("identifier", "Expected function name after int.");
    if (!name) {
      return null;
    }

    this.consumeSymbol("(", `Expected '(' after ${name.value}.`);
    const parameters = this.parseFunctionParameters();
    this.consumeSymbol(")", "Expected ')' after function parameters.");
    this.consumeSymbol("{", `Expected '{' to start ${name.value} body.`);

    const body: CppStatement[] = [];
    while (!this.is("eof") && !this.checkSymbol("}")) {
      const statement = this.parseStatement();
      if (statement) body.push(statement);
    }

    this.consumeSymbol("}", `Expected '}' to close ${name.value} body.`);
    return { kind: "Function", name: name.value, returnType, parameters, line: start.line, sourceRange: this.range(start, name), body };
  }

  private parseFunctionParameters(): CppParameter[] {
    const parameters: CppParameter[] = [];
    if (this.checkSymbol(")")) return parameters;

    while (!this.is("eof") && !this.checkSymbol(")")) {
      const start = this.current();
      const type = this.parseScalarType();
      if (!type) {
        this.error(start, "Function parameters must use a supported scalar type.", "cppParser.invalidParameterList", { token: this.tokenText(start) });
        this.synchronizeFunctionParameter();
      } else {
        if (this.matchSymbol("*")) {
          this.error(this.previous(), "Current C++ subset does not support pointer parameters.", "cppParser.invalidParameterList", { token: "*" });
        }
        const name = this.consume("identifier", `Expected parameter name after ${type}.`);
        if (name) parameters.push({ name: name.value, type, line: name.line, sourceRange: this.range(start, name) });
      }

      if (!this.matchSymbol(",")) break;
    }

    return parameters;
  }

  private parseStatement(): CppStatement | null {
    if (this.checkKeyword("int") || this.checkKeyword("double")) return this.parseVarDecl();
    if (this.checkKeyword("return")) return this.parseReturn();
    if (this.checkKeyword("if")) return this.parseIf();
    if (this.checkKeyword("while")) return this.parseWhile();
    if (this.checkKeyword("for")) return this.parseFor();
    if (this.checkKeyword("break")) return this.parseBreak();
    if (this.checkKeyword("continue")) return this.parseContinue();
    if (this.check("identifier") || this.checkSymbol("++") || this.checkSymbol("--")) return this.parseAssignmentLike();

    const token = this.current();
    this.error(token, `Unsupported C++ subset syntax near '${token.value || "end of file"}'.`, "cppParser.unexpectedToken", { token: this.tokenText(token) });
    this.synchronize();
    return null;
  }

  private parseVarDecl(): CppVarDecl | null {
    return this.parseVarDeclInternal(true);
  }

  private parseVarDeclInternal(expectSemicolon: boolean): CppVarDecl | null {
    const start = this.advance();
    const scalarType = start.value as CppScalarType;
    if (this.matchSymbol("*")) {
      this.error(this.previous(), "Current C++ subset does not support pointer variables.", "cppParser.invalidVariableDeclaration", { token: "*" });
      this.synchronize();
      return null;
    }

    const name = this.consume("identifier", `Expected variable name after ${scalarType}.`);
    if (!name) {
      this.synchronize();
      return null;
    }

    let isArray = false;
    let declarationEnd = name;
    if (this.matchSymbol("[")) {
      isArray = true;
      if (this.check("integer")) declarationEnd = this.advance();
      const closing = this.consumeSymbol("]", "Expected ']' after array bound.");
      if (closing) declarationEnd = closing;
    }

    let initializer: CppExpression | undefined;
    if (this.matchSymbol("=")) initializer = this.parseExpression();
    if (expectSemicolon) this.consumeSymbol(";", "Expected ';' after variable declaration.");
    return {
      kind: "VarDecl",
      line: start.line,
      name: name.value,
      scalarType,
      declarationRange: this.range(start, declarationEnd),
      isArray,
      initializer
    };
  }

  private parseAssignment(): CppAssignment | null {
    return this.parseAssignmentLike(true);
  }

  private parseAssignmentInternal(expectSemicolon: boolean): CppAssignment | null {
    return this.parseAssignmentLike(expectSemicolon);
  }

  private parseAssignmentLike(expectSemicolon = true): CppAssignment | null {
    if (this.checkSymbol("++") || this.checkSymbol("--")) return this.parsePrefixUpdate(expectSemicolon);
    if (!this.check("identifier")) {
      this.error(this.current(), "Expected assignment or update expression.", "cppParser.invalidAssignment", { token: this.tokenText(this.current()) });
      return null;
    }

    const target = this.advance();
    if (this.checkSymbol("(")) {
      this.parseCallExpression(target);
      if (expectSemicolon) this.consumeSymbol(";", "Expected ';' after function call statement.");
      this.error(target, "Function call statements are not supported yet.", "cppParser.invalidCallExpression", { token: target.value });
      return null;
    }

    if (this.matchSymbol("++") || this.matchSymbol("--")) {
      const operator = this.previous().value as "++" | "--";
      if (expectSemicolon) this.consumeSymbol(";", "Expected ';' after update expression.");
      return this.updateAssignment(target.value, target.line, operator, false);
    }

    if (this.matchSymbol("+=") || this.matchSymbol("-=")) {
      const operator = this.previous().value as "+=" | "-=";
      const value = this.parseExpression();
      if (expectSemicolon) this.consumeSymbol(";", "Expected ';' after compound assignment.");
      if (!value) return null;
      return this.compoundAssignment(target.value, target.line, operator, value);
    }

    this.consumeSymbol("=", "Expected '=' in assignment.");
    const expression = this.parseExpression();
    if (expectSemicolon) this.consumeSymbol(";", "Expected ';' after assignment.");
    if (!expression) return null;
    return { kind: "Assignment", line: target.line, target: target.value, expression };
  }

  private parsePrefixUpdate(expectSemicolon: boolean): CppAssignment | null {
    const operator = this.advance().value as "++" | "--";
    const target = this.consume("identifier", "Expected variable name after prefix update operator.");
    if (expectSemicolon) this.consumeSymbol(";", "Expected ';' after update expression.");
    if (!target) return null;
    return this.updateAssignment(target.value, target.line, operator, true);
  }

  private updateAssignment(target: string, line: number, operator: "++" | "--", _prefix: boolean): CppAssignment {
    return {
      kind: "Assignment",
      line,
      target,
      loweredFrom: "update-expression",
      expression: {
        kind: "BinaryExpression",
        line,
        operator: operator === "++" ? "+" : "-",
        left: { kind: "Identifier", line, name: target },
        right: { kind: "IntegerLiteral", line, value: 1, raw: "1" }
      }
    };
  }

  private compoundAssignment(target: string, line: number, operator: "+=" | "-=", value: CppExpression): CppAssignment {
    return {
      kind: "Assignment",
      line,
      target,
      loweredFrom: "compound-assignment",
      expression: {
        kind: "BinaryExpression",
        line,
        operator: operator === "+=" ? "+" : "-",
        left: { kind: "Identifier", line, name: target },
        right: value
      }
    };
  }

  private parseReturn(): CppReturn | null {
    const start = this.advance();
    const expression = this.parseExpression();
    this.consumeSymbol(";", "Expected ';' after return expression.");
    if (!expression) return null;
    return { kind: "Return", line: start.line, expression };
  }

  private parseBreak(): CppBreakStatement {
    const start = this.advance();
    this.consumeSymbol(";", "Expected ';' after break.");
    return { kind: "BreakStatement", line: start.line };
  }

  private parseContinue(): CppContinueStatement {
    const start = this.advance();
    this.consumeSymbol(";", "Expected ';' after continue.");
    return { kind: "ContinueStatement", line: start.line };
  }

  private parseIf(): CppIfStatement | null {
    const start = this.advance();
    this.consumeSymbol("(", "Expected '(' after if.");
    const condition = this.parseCondition();
    this.consumeSymbol(")", "Expected ')' after if condition.");
    const thenBody = this.parseBlock("if then body");
    let elseBody: CppStatement[] | undefined;
    if (this.matchKeyword("else")) {
      if (this.checkKeyword("if")) {
        this.error(this.current(), "Current C++ subset does not support else if.", "cppParser.invalidIfStatement", { token: this.tokenText(this.current()) });
        this.synchronize();
        return null;
      }
      elseBody = this.parseBlock("else body");
    }
    if (!condition) return null;
    return { kind: "IfStatement", line: start.line, condition, thenBody, elseBody };
  }

  private parseWhile(): CppWhileStatement | null {
    const start = this.advance();
    this.consumeSymbol("(", "Expected '(' after while.");
    const condition = this.parseCondition("while");
    this.consumeSymbol(")", "Expected ')' after while condition.");
    const body = this.parseBlock("while body");
    if (!condition) return null;
    return { kind: "WhileStatement", line: start.line, condition, body };
  }

  private parseFor(): CppForStatement | null {
    const start = this.advance();
    this.consumeSymbol("(", "Expected '(' after for.");

    let initializer: CppVarDecl | CppAssignment | null = null;
    if (this.matchSymbol(";")) {
      initializer = null;
    } else if (this.checkKeyword("int") || this.checkKeyword("double")) {
      initializer = this.parseVarDeclInternal(false);
      this.consumeSymbol(";", "Expected ';' after for initializer.");
    } else if (this.check("identifier")) {
      initializer = this.parseAssignmentLike(false);
      this.consumeSymbol(";", "Expected ';' after for initializer.");
    } else {
      this.error(this.current(), "Current C++ subset supports only one int declaration or assignment in for initializer.", "cppParser.invalidForStatement", { token: this.tokenText(this.current()) });
      this.synchronizeForHeader();
      this.consumeSymbol(";", "Expected ';' after for initializer.");
    }

    let condition: CppCondition | null = null;
    if (this.checkSymbol(";")) {
      this.error(this.current(), "for without condition is not supported yet", "cppParser.invalidForStatement", { token: ";" });
      this.advance();
    } else {
      condition = this.parseCondition("for") ?? null;
      this.consumeSymbol(";", "Expected ';' after for condition.");
    }

    let increment: CppAssignment | null = null;
    if (!this.checkSymbol(")")) {
      if (this.check("identifier") || this.checkSymbol("++") || this.checkSymbol("--")) {
        increment = this.parseAssignmentLike(false);
      } else {
        this.error(this.current(), "Current C++ subset supports only one assignment in for increment.", "cppParser.invalidForStatement", { token: this.tokenText(this.current()) });
        this.synchronizeForHeader();
      }
    }

    this.consumeSymbol(")", "Expected ')' after for increment.");
    const body = this.parseBlock("for body");
    return { kind: "ForStatement", line: start.line, initializer, condition, increment, body };
  }

  private parseBlock(name: string): CppStatement[] {
    this.consumeSymbol("{", `Expected '{' to start ${name}.`);
    const body: CppStatement[] = [];
    while (!this.is("eof") && !this.checkSymbol("}")) {
      const statement = this.parseStatement();
      if (statement) body.push(statement);
    }
    this.consumeSymbol("}", `Expected '}' to close ${name}.`);
    return body;
  }

  private parseCondition(owner: "if" | "while" | "for" = "if"): CppCondition | undefined {
    const left = this.parseExpression();
    if (!left) return undefined;
    const operator = this.current();
    if (!this.isConditionOperator(operator.value)) {
      this.error(operator, `Expected comparison operator ==, !=, <, <=, >, or >= in ${owner} condition.`, "cppParser.unsupportedOperator", {
        operator: this.tokenText(operator), construct: `${owner} condition`
      });
      return undefined;
    }
    this.advance();
    const right = this.parseExpression();
    if (!right) return undefined;
    return {
      kind: "Condition",
      line: left.line,
      left,
      operator: operator.value,
      right,
      sourceRange: left.sourceRange && right.sourceRange
        ? { start: left.sourceRange.start, end: right.sourceRange.end }
        : undefined
    };
  }

  private parseExpression(): CppExpression | undefined {
    let expression = this.parsePrimary();
    while (expression && (this.matchSymbol("+") || this.matchSymbol("-") || this.matchSymbol("*") || this.matchSymbol("/"))) {
      const operator = this.previous().value as CppBinaryExpression["operator"];
      const right = this.parsePrimary();
      if (!right) return expression;
      expression = {
        kind: "BinaryExpression",
        line: expression.line,
        operator,
        left: expression,
        right,
        sourceRange: expression.sourceRange && right.sourceRange
          ? { start: expression.sourceRange.start, end: right.sourceRange.end }
          : undefined
      };
    }
    return expression;
  }

  private parsePrimary(): CppExpression | undefined {
    if (this.match("integer")) {
      const token = this.previous();
      return { kind: "IntegerLiteral", line: token.line, value: Number(token.value), raw: token.value, sourceRange: this.range(token) } satisfies CppIntegerLiteral;
    }

    if (this.match("floating")) {
      return this.doubleLiteral(this.previous());
    }

    if (this.matchSymbol("-")) {
      const sign = this.previous();
      const number = this.current();
      if (!this.match("integer") && !this.match("floating")) {
        this.error(number, "Expected numeric literal after unary '-'.", "cppParser.unsupportedExpression", { token: this.tokenText(number) });
        return undefined;
      }
      if (number.kind === "floating") return this.doubleLiteral(number, sign);
      return { kind: "IntegerLiteral", line: sign.line, value: -Number(number.value), raw: `-${number.value}`, sourceRange: this.range(sign, number) };
    }

    if (this.match("identifier")) {
      const token = this.previous();
      if (this.checkSymbol("(")) {
        return this.parseCallExpression(token);
      }
      return { kind: "Identifier", line: token.line, name: token.value, sourceRange: this.range(token) };
    }

    this.error(this.current(), "Expected integer literal or identifier expression.", "cppParser.unsupportedExpression", { token: this.tokenText(this.current()) });
    return undefined;
  }

  private parseCallExpression(callee: CppToken): CppCallExpression {
    const args: CppExpression[] = [];
    this.consumeSymbol("(", `Expected '(' after ${callee.value}.`);
    if (!this.checkSymbol(")")) {
      while (!this.is("eof") && !this.checkSymbol(")")) {
        const arg = this.parseExpression();
        if (arg) args.push(arg);
        if (!this.matchSymbol(",")) break;
      }
    }
    const closing = this.consumeSymbol(")", "Expected ')' after function call.");
    return {
      kind: "CallExpression",
      line: callee.line,
      callee: callee.value,
      arguments: args,
      sourceRange: this.range(callee, closing ?? callee)
    };
  }

  private synchronize() {
    while (!this.is("eof") && !this.checkSymbol(";") && !this.checkSymbol("}")) this.advance();
    if (this.checkSymbol(";")) this.advance();
  }

  private synchronizeForHeader() {
    while (!this.is("eof") && !this.checkSymbol(";") && !this.checkSymbol(")")) this.advance();
  }

  private synchronizeFunctionParameter() {
    while (!this.is("eof") && !this.checkSymbol(",") && !this.checkSymbol(")")) this.advance();
  }

  private consume(kind: CppToken["kind"], message: string): CppToken | null {
    if (this.check(kind)) return this.advance();
    this.error(this.current(), message, "cppParser.expectedToken", {
      expectedToken: kind,
      ...(this.is("eof") ? {} : { actualToken: this.tokenText(this.current()) })
    });
    return null;
  }

  private consumeSymbol(value: string, message: string): CppToken | null {
    if (this.checkSymbol(value)) return this.advance();
    if (value === ";") this.errorAtInsertion(this.current(), message, "cppParser.missingSemicolon", {});
    else this.error(this.current(), message, "cppParser.expectedToken", {
      expectedToken: value,
      ...(this.is("eof") ? {} : { actualToken: this.tokenText(this.current()) })
    });
    return null;
  }

  private match(kind: CppToken["kind"]): boolean {
    if (!this.check(kind)) return false;
    this.advance();
    return true;
  }

  private matchKeyword(value: string): boolean {
    if (!this.checkKeyword(value)) return false;
    this.advance();
    return true;
  }

  private matchSymbol(value: string): boolean {
    if (!this.checkSymbol(value)) return false;
    this.advance();
    return true;
  }

  private check(kind: CppToken["kind"]): boolean {
    return this.current().kind === kind;
  }

  private checkKeyword(value: string): boolean {
    const token = this.current();
    return token.kind === "keyword" && token.value === value;
  }

  private checkSymbol(value: string): boolean {
    const token = this.current();
    return token.kind === "symbol" && token.value === value;
  }

  private isConditionOperator(value: string): value is CppConditionOperator {
    return value === "==" || value === "!=" || value === "<" || value === "<=" || value === ">" || value === ">=";
  }

  private is(kind: CppToken["kind"]): boolean {
    return this.current().kind === kind;
  }

  private advance(): CppToken {
    if (!this.is("eof")) this.index += 1;
    return this.previous();
  }

  private current(): CppToken {
    return this.tokens[this.index] ?? this.tokens[this.tokens.length - 1];
  }

  private previous(): CppToken {
    return this.tokens[Math.max(0, this.index - 1)];
  }

  private error<C extends DiagnosticCode>(token: CppToken, message: string, code: C, params: DiagnosticParams<C>) {
    this.diagnostics.push(createStructuredDiagnostic(token.line, message, code, params, "error", {
      producer: "cpp-parser",
      sourceRange: {
        start: { line: token.line, column: token.column, offset: token.startOffset },
        end: { line: token.endLine, column: token.endColumn, offset: token.endOffset }
      }
    }));
  }

  private errorAtInsertion<C extends DiagnosticCode>(token: CppToken, message: string, code: C, params: DiagnosticParams<C>) {
    this.diagnostics.push(createStructuredDiagnostic(token.line, message, code, params, "error", {
      producer: "cpp-parser",
      sourceRange: {
        start: { line: token.line, column: token.column, offset: token.startOffset },
        end: { line: token.line, column: token.column, offset: token.startOffset }
      }
    }));
  }

  private tokenText(token: CppToken): string {
    return token.kind === "eof" ? "end of file" : token.value;
  }

  private parseScalarType(): CppScalarType | null {
    if (this.matchKeyword("int")) return "int";
    if (this.matchKeyword("double")) return "double";
    return null;
  }

  private doubleLiteral(token: CppToken, sign?: CppToken): CppDoubleLiteral {
    const raw = `${sign ? "-" : ""}${token.value}`;
    const numericPattern = "(?:\\d+\\.\\d*|\\d*\\.\\d+|\\d+[eE][+-]?\\d+|\\d+\\.\\d*[eE][+-]?\\d+|\\d*\\.\\d+[eE][+-]?\\d+)";
    const exactNumeric = new RegExp(`^${numericPattern}$`);
    const suffixParts = token.value.match(new RegExp(`^(${numericPattern})([A-Za-z_][A-Za-z0-9_]*)$`));
    const hasMalformedExponent = /[eE][+-]?$/.test(token.value);
    const suffix = exactNumeric.test(token.value) || hasMalformedExponent ? undefined : suffixParts?.[2];
    const numericText = suffix ? suffixParts?.[1] ?? token.value : token.value;
    const validSyntax = exactNumeric.test(numericText);
    const numericValue = validSyntax ? Number(`${sign ? "-" : ""}${numericText}`) : Number.NaN;
    const literalIssue = suffix
      ? "unsupported-suffix"
      : !validSyntax || token.value.length > 256
        ? "invalid"
        : !Number.isFinite(numericValue)
          ? "out-of-range"
          : undefined;
    return {
      kind: "DoubleLiteral",
      line: sign?.line ?? token.line,
      value: numericValue,
      raw,
      representation: encodeNumberToBinary64(numericValue),
      ...(literalIssue ? { literalIssue } : {}),
      ...(suffix ? { suffix } : {}),
      sourceRange: this.range(sign ?? token, token)
    };
  }

  private range(start: CppToken, end: CppToken = start) {
    return {
      start: { line: start.line, column: start.column, offset: start.startOffset },
      end: { line: end.endLine, column: end.endColumn, offset: end.endOffset }
    };
  }
}
