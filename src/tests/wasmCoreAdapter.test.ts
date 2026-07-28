import { describe, expect, it } from "vitest";
import gr2Step1 from "../../tests/golden/gr2.step1.json";
import jzeTaken from "../../tests/golden/jze.taken.json";
import ladaStep1 from "../../tests/golden/lada.step1.json";
import simpleReady from "../../tests/golden/simple.ready.json";
import simpleStep1 from "../../tests/golden/simple.step1.json";
import simpleStep2 from "../../tests/golden/simple.step2.json";
import simpleStep3 from "../../tests/golden/simple.step3.json";
import subaStep1 from "../../tests/golden/suba.step1.json";
import type { CometStateDto } from "../core/coreDto";
import { DEFAULT_CASL_SOURCE } from "../core/defaultSource";
import { mockCaslCore } from "../core/mockCaslCore";
import { parseWasmJson, WasmCoreAdapter } from "../core/wasmCoreAdapter";
import type { DebuggerMutationRequest, DebuggerOfficialFlags, DebuggerWordMutationTarget } from "../debugger/debuggerMutation";
import type { SourceUnitId } from "../documents/types";
import { transpileCppToCasl } from "../transpiler/cppTranspiler";

type NodeFsSync = {
  existsSync(path: string): boolean;
  statSync(path: string): { mtimeMs: number };
};

const gr2Source = `MAIN START
     LD    GR2,X
     ADDA  GR2,Y
     ST    GR2,Z
     RET
X    DC    3
Y    DC    4
Z    DS    1
     END`;

const ladSource = `MAIN START
     LAD   GR1,VALUE
     RET
VALUE DC   10
     END`;

const subaSource = `MAIN START
     LD    GR1,A
     SUBA  GR1,B
     RET
A    DC    20
B    DC    5
     END`;

const jzeTakenSource = `MAIN START
     LD    GR1,A
     CPA   GR1,B
     JZE   SAME
     LAD   GR2,0
     RET
SAME LAD   GR2,1
     RET
A    DC    10
B    DC    10
     END`;

const logicOperationsSource = `MAIN START
     LD    GR1,A
     AND   GR1,MASK
     OR    GR1,B
     XOR   GR1,C
     ST    GR1,RESULT
     RET
A    DC    #00F0
MASK DC    #0F0F
B    DC    #0003
C    DC    #0001
RESULT DS  1
     END`;

const jovTakenSource = `MAIN START
     LD    GR1,A
     ADDL  GR1,B
     JOV   OVER
     LAD   GR2,0
     RET
OVER LAD   GR2,1
     RET
A    DC    #FFFF
B    DC    1
     END`;

const shiftOperationsSource = `MAIN START
     LD    GR1,A
     SLL   GR1,1
     SRL   GR1,1
     SLA   GR1,1
     SRA   GR1,1
     ST    GR1,RESULT
     RET
A    DC    3
RESULT DS  1
     END`;

const callReturnSource = `MAIN START
     LAD   GR1,5
     CALL  SUB
     ST    GR1,RESULT
     RET
SUB  ADDA  GR1,ONE
     RET
ONE  DC    1
RESULT DS  1
     END`;

const whileSumCppSource = `int main() {
    int i = 3;
    int sum = 0;
    while (i > 0) {
        sum = sum + i;
        i = i - 1;
    }
    return sum;
}`;

const functionCallCppSource = `int addOne() {
    return 1;
}

int main() {
    int x;
    x = addOne();
    return x;
}`;

const functionArgumentCppSource = `int addOne(int x) {
    return x + 1;
}

int main() {
    int y;
    y = addOne(5);
    return y;
}`;

const functionArgumentsCppSource = `int add(int a, int b) {
    return a + b;
}

int main() {
    int result;
    result = add(2, 3);
    return result;
}`;

function debuggerRequest(
  target: DebuggerWordMutationTarget,
  nextWord: number
): DebuggerMutationRequest & { target: DebuggerWordMutationTarget; nextWord: number } {
  return {
    mutationId: `wasm-test:${target.kind}`,
    sourceUnitId: "source:wasm-test" as SourceUnitId,
    assemblyId: "assembly:wasm-test",
    executionEpoch: 1,
    target,
    nextWord
  };
}

function debuggerFlagRequest(
  nextFlags: DebuggerOfficialFlags = { of: true, sf: true, zf: true }
): DebuggerMutationRequest & { target: { kind: "flag-register" }; nextFlags: DebuggerOfficialFlags } {
  return {
    mutationId: "wasm-test:flag-register",
    sourceUnitId: "source:wasm-test" as SourceUnitId,
    assemblyId: "assembly:wasm-test",
    executionEpoch: 1,
    target: { kind: "flag-register" },
    nextFlags
  };
}

function wasmArtifactsAvailable(): boolean {
  const processLike = (globalThis as { process?: { cwd?: () => string; getBuiltinModule?: (name: string) => NodeFsSync } }).process;
  const cwd = processLike?.cwd?.();
  const fs = processLike?.getBuiltinModule?.("fs");
  if (!cwd || !fs) return false;
  const js = `${cwd}\\public\\wasm\\stugx_casl_core.js`;
  const wasm = `${cwd}\\public\\wasm\\stugx_casl_core.wasm`;
  if (!fs.existsSync(js) || !fs.existsSync(wasm)) return false;

  const sources = [
    `${cwd}\\cpp-core\\src\\InstructionSet.cpp`,
    `${cwd}\\cpp-core\\src\\Assembler.cpp`,
    `${cwd}\\cpp-core\\src\\CometVm.cpp`,
    `${cwd}\\cpp-core\\src\\DiagnosticCatalog.cpp`,
    `${cwd}\\cpp-core\\wasm\\wasm_bridge.cpp`
  ].filter((path) => fs.existsSync(path));
  const outputMtime = Math.min(fs.statSync(js).mtimeMs, fs.statSync(wasm).mtimeMs);
  return sources.every((path) => outputMtime >= fs.statSync(path).mtimeMs);
}

const describeWasm = wasmArtifactsAvailable() ? describe : describe.skip;

describe("WASM adapter boundary handling", () => {
  it("invalid_json_from_bridge_reports_operation_and_last_error", () => {
    expect(() =>
      parseWasmJson("{ invalid", "assemble", {
        getLastError: () => "bridge detail"
      })
    ).toThrow(/Failed to parse WASM assemble JSON: .*Raw response: \{ invalid.*bridge detail/);
  });

  it("wasm_structured_and_legacy_diagnostic_payloads_remain_supported", () => {
    const structured = parseWasmJson<{ diagnostics: Array<{ code?: string; producer?: string; params?: Record<string, string | number | boolean>; sourceRange?: unknown; relatedLocations?: unknown[]; message: string }> }>(
      '{"diagnostics":[{"message":"Undefined label: MISSING","code":"assembler.unknownSymbol","producer":"assembler","params":{"symbol":"MISSING"},"sourceRange":{"start":{"line":2,"column":9,"offset":19},"end":{"line":2,"column":16,"offset":26}},"relatedLocations":[]}]}',
      "assemble",
      { getLastError: () => "" }
    );
    const legacy = parseWasmJson<{ diagnostics: Array<{ code?: string; message: string }> }>(
      '{"diagnostics":[{"message":"legacy message"}]}',
      "assemble",
      { getLastError: () => "" }
    );
    expect(structured.diagnostics[0]).toMatchObject({ code: "assembler.unknownSymbol", producer: "assembler", params: { symbol: "MISSING" } });
    expect(structured.diagnostics[0].sourceRange).toEqual({ start: { line: 2, column: 9, offset: 19 }, end: { line: 2, column: 16, offset: 26 } });
    expect(legacy.diagnostics[0]).toEqual({ message: "legacy message" });
  });
});

function legacyGoldenWindow(state: CometStateDto): CometStateDto {
  return {
    ...state,
    memoryWindow: state.memoryWindow.filter((row) => row.address <= 0x002a)
  };
}

describeWasm("WasmCoreAdapter golden parity", () => {
  it("wasm empty source returns diagnostics_without_crashing", async () => {
    const adapter = new WasmCoreAdapter();
    const result = await adapter.assemble("");

    expect(result.ok).toBe(false);
    expect(result.state.runState).toBe("Error");
    expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toEqual(["assembler.missingStart", "assembler.missingEnd"]);
    expect(result.diagnostics.map((diagnostic) => diagnostic.message)).toEqual(
      expect.arrayContaining(["CASL source must contain START directive", "CASL source must contain END directive"])
    );
    await adapter.dispose();
  });

  it("wasm structured ranges and related locations match the diagnostic contract", async () => {
    const adapter = new WasmCoreAdapter();
    const source = "MAIN START\n LD GR1,MISSING\n END";
    const unknown = await adapter.assemble(source);
    const symbol = unknown.diagnostics.find((diagnostic) => diagnostic.code === "assembler.unknownSymbol");
    expect(symbol?.sourceRange).toEqual({
      start: { line: 2, column: 9, offset: 19 },
      end: { line: 2, column: 16, offset: 26 }
    });
    expect(symbol?.sourceRange).toEqual(mockCaslCore.assemble(source).diagnostics.find((diagnostic) => diagnostic.code === "assembler.unknownSymbol")?.sourceRange);

    const duplicate = await adapter.assemble("MAIN START\nA DC 1\nA DC 2\n END");
    const label = duplicate.diagnostics.find((diagnostic) => diagnostic.code === "assembler.duplicateLabel");
    expect(label?.sourceRange?.start.line).toBe(3);
    expect(label?.relatedLocations?.[0].sourceRange.start.line).toBe(2);

    for (const [pilotSource, code] of [
      ["MAIN START\nX BADOP\n END", "assembler.unknownOpcode"],
      ["MAIN START\n LD GR8,A\nA DC 1\n END", "assembler.invalidRegister"],
      ["MAIN START\n LD GR1,A,\nA DC 1\n END", "assembler.malformedOperandList"],
      ["MAIN START\n RET", "assembler.missingEnd"]
    ] as const) {
      const wasmResult = await adapter.assemble(pilotSource);
      const mockResult = mockCaslCore.assemble(pilotSource);
      expect(wasmResult.diagnostics.find((diagnostic) => diagnostic.code === code)?.sourceRange, code).toEqual(
        mockResult.diagnostics.find((diagnostic) => diagnostic.code === code)?.sourceRange
      );
    }
    await adapter.dispose();
  });

  it("wasm_p1_operand_and_literal_diagnostics_match_the_mock_contract", async () => {
    const adapter = new WasmCoreAdapter();
    for (const source of [
      "MAIN START\n LD GR1\n END",
      "MAIN START\n LD GR1,A,GR2,EXTRA\nA DC 1\n END",
      "MAIN START\nA DC NOPE\n END"
    ]) {
      const wasm = await adapter.assemble(source);
      const mock = mockCaslCore.assemble(source);
      expect(wasm.diagnostics.map(({ code, producer, params, sourceRange }) => ({ code, producer, params, sourceRange }))).toEqual(
        mock.diagnostics.map(({ code, producer, params, sourceRange }) => ({ code, producer, params, sourceRange }))
      );
    }
    await adapter.dispose();
  });

  it("wasm assemble simple ready matches golden", async () => {
    const adapter = new WasmCoreAdapter();
    const result = await adapter.assemble(DEFAULT_CASL_SOURCE);

    expect(legacyGoldenWindow(result.state)).toEqual(simpleReady as CometStateDto);
    await adapter.dispose();
  });

  it("wasm step1 matches golden", async () => {
    const adapter = new WasmCoreAdapter();
    await adapter.assemble(DEFAULT_CASL_SOURCE);
    const result = await adapter.step();

    expect(legacyGoldenWindow(result.state)).toEqual(simpleStep1 as CometStateDto);
    await adapter.dispose();
  });

  it("wasm step2 matches golden", async () => {
    const adapter = new WasmCoreAdapter();
    await adapter.assemble(DEFAULT_CASL_SOURCE);
    await adapter.step();
    const result = await adapter.step();

    expect(legacyGoldenWindow(result.state)).toEqual(simpleStep2 as CometStateDto);
    await adapter.dispose();
  });

  it("wasm step3 matches golden", async () => {
    const adapter = new WasmCoreAdapter();
    await adapter.assemble(DEFAULT_CASL_SOURCE);
    await adapter.step();
    await adapter.step();
    const result = await adapter.step();

    expect(legacyGoldenWindow(result.state)).toEqual(simpleStep3 as CometStateDto);
    await adapter.dispose();
  });

  it("wasm GR2 step1 matches golden", async () => {
    const adapter = new WasmCoreAdapter();
    await adapter.assemble(gr2Source);
    const result = await adapter.step();

    expect(legacyGoldenWindow(result.state)).toEqual(gr2Step1 as CometStateDto);
    await adapter.dispose();
  });

  it("wasm LAD step1 matches golden", async () => {
    const adapter = new WasmCoreAdapter();
    await adapter.assemble(ladSource);
    const result = await adapter.step();

    expect(legacyGoldenWindow(result.state)).toEqual(ladaStep1 as CometStateDto);
    await adapter.dispose();
  });

  it("wasm SUBA step matches golden", async () => {
    const adapter = new WasmCoreAdapter();
    await adapter.assemble(subaSource);
    await adapter.step();
    const result = await adapter.step();

    expect(legacyGoldenWindow(result.state)).toEqual(subaStep1 as CometStateDto);
    await adapter.dispose();
  });

  it("wasm JZE taken matches golden", async () => {
    const adapter = new WasmCoreAdapter();
    await adapter.assemble(jzeTakenSource);
    await adapter.step();
    await adapter.step();
    const result = await adapter.step();

    expect(legacyGoldenWindow(result.state)).toEqual(jzeTaken as CometStateDto);
    await adapter.dispose();
  });

  it("wasm run while sum reaches Finished", async () => {
    const adapter = new WasmCoreAdapter();
    const transpiled = transpileCppToCasl(whileSumCppSource);

    expect(transpiled.ok).toBe(true);
    await adapter.assemble(transpiled.caslSource);
    const result = await adapter.run(1000);

    expect(result.runState).toBe("Finished");
    expect(result.gr[0]).toBe(0x0006);
    expect(result.stepCount).toBe(36);
    await adapter.dispose();
  });

  it("wasm run C++ function call reaches Finished", async () => {
    const adapter = new WasmCoreAdapter();
    const transpiled = transpileCppToCasl(functionCallCppSource);

    expect(transpiled.ok).toBe(true);
    await adapter.assemble(transpiled.caslSource);
    const result = await adapter.run(100);

    expect(result.runState).toBe("Finished");
    expect(result.gr[0]).toBe(0x0001);
    expect(result.callDepth).toBe(0);
    await adapter.dispose();
  });

  it("wasm run C++ single argument function reaches Finished", async () => {
    const adapter = new WasmCoreAdapter();
    const transpiled = transpileCppToCasl(functionArgumentCppSource);

    expect(transpiled.ok).toBe(true);
    await adapter.assemble(transpiled.caslSource);
    const result = await adapter.run(120);

    expect(result.runState).toBe("Finished");
    expect(result.gr[0]).toBe(0x0006);
    expect(result.callDepth).toBe(0);
    await adapter.dispose();
  });

  it("wasm run C++ multi-register argument function reaches Finished", async () => {
    const adapter = new WasmCoreAdapter();
    const transpiled = transpileCppToCasl(functionArgumentsCppSource);

    expect(transpiled.ok).toBe(true);
    await adapter.assemble(transpiled.caslSource);
    const result = await adapter.run(140);

    expect(result.runState).toBe("Finished");
    expect(result.gr[0]).toBe(0x0005);
    expect(result.callDepth).toBe(0);
    await adapter.dispose();
  });

  it("wasm logic operations run to expected result", async () => {
    const adapter = new WasmCoreAdapter();
    await adapter.assemble(logicOperationsSource);
    const result = await adapter.run(20);

    expect(result.runState).toBe("Finished");
    expect(result.gr[1]).toBe(0x0002);
    await adapter.dispose();
  });

  it("wasm ADDL overflow drives JOV", async () => {
    const adapter = new WasmCoreAdapter();
    await adapter.assemble(jovTakenSource);
    await adapter.step();
    await adapter.step();
    const jump = await adapter.step();
    const afterTarget = await adapter.step();

    expect(jump.state.lastInstructionKind).toBe("JOV");
    expect(jump.state.pr).toBe(jump.state.sourceRows.find((row) => row.label === "OVER")?.address);
    expect(afterTarget.state.gr[2]).toBe(0x0001);
    await adapter.dispose();
  });

  it("wasm shift operations run to expected result", async () => {
    const adapter = new WasmCoreAdapter();
    await adapter.assemble(shiftOperationsSource);
    const afterStore = await adapter.run(6);

    expect(afterStore.gr[1]).toBe(0x0003);
    const resultRow = afterStore.sourceRows.find((row) => row.label === "RESULT");
    expect(resultRow).toBeDefined();
    expect(afterStore.lastMemoryWriteAddress).toBe(resultRow!.address);
    expect(afterStore.mdr).toBe(0x0003);

    const result = await adapter.run(5);
    expect(result.runState).toBe("Finished");
    await adapter.dispose();
  });

  it("wasm call return demo stores result and clears call depth", async () => {
    const adapter = new WasmCoreAdapter();
    await adapter.assemble(callReturnSource);
    const result = await adapter.run(20);
    const resultRow = result.sourceRows.find((row) => row.label === "RESULT");

    expect(result.runState).toBe("Finished");
    expect(result.gr[1]).toBe(0x0006);
    expect(result.callDepth).toBe(0);
    expect(resultRow).toBeDefined();
    expect(result.memoryWindow.find((row) => row.address === resultRow!.address)?.value).toBe(0x0006);
    await adapter.dispose();
  });

  it("wasm_debugger_mutation_matches_the_three_flag_and_single_target_contract", async () => {
    const adapter = new WasmCoreAdapter();
    const ready = await adapter.assemble(ladSource);
    const start = ready.state.pr;

    const register = await adapter.mutateDebuggerState!(
      debuggerRequest({ kind: "general-register", register: "GR3" }, 0xabcd)
    );
    expect(register.status).toBe("applied");
    expect(register.state.gr[3]).toBe(0xabcd);
    expect(register.state.stepCount).toBe(0);

    const flags = await adapter.mutateDebuggerState!(
      debuggerFlagRequest()
    );
    expect([flags.state.frOF, flags.state.frSF, flags.state.frZF]).toEqual([true, true, true]);
    expect(flags.state).not.toHaveProperty("frCF");

    const invalidFlags = await adapter.mutateDebuggerState!({
      ...debuggerFlagRequest(),
      nextFlags: { of: false, sf: false, zf: false, cf: true }
    } as unknown as DebuggerMutationRequest);
    expect(invalidFlags.status).toBe("rejected");
    expect(invalidFlags.reason).toBe("invalid-value");
    expect([invalidFlags.state.frOF, invalidFlags.state.frSF, invalidFlags.state.frZF]).toEqual([true, true, true]);

    const memory = await adapter.mutateDebuggerState!(
      debuggerRequest({ kind: "memory-word", address: start }, 0x0000)
    );
    expect(memory.state.memoryWindow.find((row) => row.address === start)?.value).toBe(0x0000);
    await adapter.dispose();
  });

  it("wasm_executes_runtime_program_override_and_reload_restores_assembly_image", async () => {
    const adapter = new WasmCoreAdapter();
    const ready = await adapter.assemble(ladSource);
    const start = ready.state.pr;
    const original = ready.state.memoryWindow.find((row) => row.address === start)!.value;

    await adapter.mutateDebuggerState!(
      debuggerRequest({ kind: "memory-word", address: start }, 0x0000)
    );
    const step = await adapter.step();
    expect(step.state.lastInstructionKind).toBe("NOP");
    expect(step.state.gr[1]).toBe(0);
    expect(step.state.pr).toBe(start + 1);

    const reloaded = await adapter.reload("assembled");
    expect(reloaded.memoryWindow.find((row) => row.address === start)?.value).toBe(original);
    await adapter.dispose();
  });

  it("wasm_full_clear_unloads_registers_memory_and_execution_metadata", async () => {
    const adapter = new WasmCoreAdapter();
    await adapter.assemble(ladSource);
    await adapter.mutateDebuggerState!(
      debuggerRequest({ kind: "general-register", register: "GR1" }, 0x0042)
    );
    const cleared = await adapter.fullClear!();

    expect(cleared.runState).toBe("Idle");
    expect(cleared.gr).toEqual(Array(8).fill(0));
    expect(cleared.sourceRows).toEqual([]);
    expect(cleared.stepCount).toBe(0);
    await adapter.dispose();
  });
});
