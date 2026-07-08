import type { Diagnostic } from "../core/types";
import type {
  CppAssignment,
  CppBinaryExpression,
  CppCondition,
  CppConditionOperator,
  CppExpression,
  CppFunction,
  CppIfStatement,
  CppIntegerLiteral,
  CppProgram,
  CppReturn,
  CppStatement,
  CppVarDecl
} from "./cppAst";
import { CppToken, lexCpp } from "./cppLexer";

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
    const main = this.parseMainFunction();
    if (main && !this.is("eof")) {
      this.error(this.current(), "Only one int main() function is supported in the current C++ subset.");
    }
    return {
      program: main ? { kind: "Program", main } : null,
      diagnostics: this.diagnostics
    };
  }

  private parseMainFunction(): CppFunction | null {
    const start = this.current();
    if (!this.matchKeyword("int")) {
      this.error(start, "Current C++ subset only supports int main().");
      return null;
    }

    if (this.matchSymbol("*")) {
      this.error(this.previous(), "Current C++ subset does not support pointer return types.");
      return null;
    }

    const name = this.consume("identifier", "Current C++ subset only supports int main().");
    if (!name || name.value !== "main") {
      this.error(name ?? this.current(), "Current C++ subset only supports int main().");
      return null;
    }

    this.consumeSymbol("(", "Expected '(' after main.");
    this.consumeSymbol(")", "Current C++ subset only supports int main() with no parameters.");
    this.consumeSymbol("{", "Expected '{' to start main body.");

    const body: CppStatement[] = [];
    while (!this.is("eof") && !this.checkSymbol("}")) {
      const statement = this.parseStatement();
      if (statement) body.push(statement);
    }

    this.consumeSymbol("}", "Expected '}' to close main body.");
    return { kind: "Function", name: "main", returnType: "int", line: start.line, body };
  }

  private parseStatement(): CppStatement | null {
    if (this.checkKeyword("int")) return this.parseVarDecl();
    if (this.checkKeyword("return")) return this.parseReturn();
    if (this.checkKeyword("if")) return this.parseIf();
    if (this.check("identifier")) return this.parseAssignment();

    const token = this.current();
    this.error(token, `Unsupported C++ subset syntax near '${token.value || "end of file"}'.`);
    this.synchronize();
    return null;
  }

  private parseVarDecl(): CppVarDecl | null {
    const start = this.advance();
    if (this.matchSymbol("*")) {
      this.error(this.previous(), "Current C++ subset does not support pointer variables.");
      this.synchronize();
      return null;
    }

    const name = this.consume("identifier", "Expected variable name after int.");
    if (!name) {
      this.synchronize();
      return null;
    }

    let initializer: CppExpression | undefined;
    if (this.matchSymbol("=")) initializer = this.parseExpression();
    this.consumeSymbol(";", "Expected ';' after variable declaration.");
    return { kind: "VarDecl", line: start.line, name: name.value, initializer };
  }

  private parseAssignment(): CppAssignment | null {
    const target = this.advance();
    if (this.checkSymbol("(")) {
      this.error(target, "Current C++ subset does not support function calls.");
      this.synchronize();
      return null;
    }
    this.consumeSymbol("=", "Expected '=' in assignment.");
    const expression = this.parseExpression();
    this.consumeSymbol(";", "Expected ';' after assignment.");
    if (!expression) return null;
    return { kind: "Assignment", line: target.line, target: target.value, expression };
  }

  private parseReturn(): CppReturn | null {
    const start = this.advance();
    const expression = this.parseExpression();
    this.consumeSymbol(";", "Expected ';' after return expression.");
    if (!expression) return null;
    return { kind: "Return", line: start.line, expression };
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
        this.error(this.current(), "Current C++ subset does not support else if.");
        this.synchronize();
        return null;
      }
      elseBody = this.parseBlock("else body");
    }
    if (!condition) return null;
    return { kind: "IfStatement", line: start.line, condition, thenBody, elseBody };
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

  private parseCondition(): CppCondition | undefined {
    const left = this.parseExpression();
    if (!left) return undefined;
    const operator = this.current();
    if (!this.isConditionOperator(operator.value)) {
      this.error(operator, "Expected comparison operator ==, !=, <, <=, >, or >= in if condition.");
      return undefined;
    }
    this.advance();
    const right = this.parseExpression();
    if (!right) return undefined;
    return { kind: "Condition", line: left.line, left, operator: operator.value, right };
  }

  private parseExpression(): CppExpression | undefined {
    let expression = this.parsePrimary();
    while (expression && (this.matchSymbol("+") || this.matchSymbol("-"))) {
      const operator = this.previous().value as CppBinaryExpression["operator"];
      const right = this.parsePrimary();
      if (!right) return expression;
      expression = { kind: "BinaryExpression", line: expression.line, operator, left: expression, right };
    }
    return expression;
  }

  private parsePrimary(): CppExpression | undefined {
    if (this.match("integer")) {
      const token = this.previous();
      return { kind: "IntegerLiteral", line: token.line, value: Number(token.value), raw: token.value } satisfies CppIntegerLiteral;
    }

    if (this.matchSymbol("-")) {
      const sign = this.previous();
      const number = this.consume("integer", "Expected integer literal after unary '-'.");
      if (!number) return undefined;
      return { kind: "IntegerLiteral", line: sign.line, value: -Number(number.value), raw: `-${number.value}` };
    }

    if (this.match("identifier")) {
      const token = this.previous();
      if (this.checkSymbol("(")) {
        this.error(token, "Current C++ subset does not support function calls.");
        this.synchronize();
        return undefined;
      }
      return { kind: "Identifier", line: token.line, name: token.value };
    }

    this.error(this.current(), "Expected integer literal or identifier expression.");
    return undefined;
  }

  private synchronize() {
    while (!this.is("eof") && !this.checkSymbol(";") && !this.checkSymbol("}")) this.advance();
    if (this.checkSymbol(";")) this.advance();
  }

  private consume(kind: CppToken["kind"], message: string): CppToken | null {
    if (this.check(kind)) return this.advance();
    this.error(this.current(), message);
    return null;
  }

  private consumeSymbol(value: string, message: string): CppToken | null {
    if (this.checkSymbol(value)) return this.advance();
    this.error(this.current(), message);
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

  private error(token: CppToken, message: string) {
    this.diagnostics.push({ line: token.line, message, severity: "error" });
  }
}
