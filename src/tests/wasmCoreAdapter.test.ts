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
import { WasmCoreAdapter } from "../core/wasmCoreAdapter";
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

const whileSumCppSource = `int main() {
    int i = 3;
    int sum = 0;
    while (i > 0) {
        sum = sum + i;
        i = i - 1;
    }
    return sum;
}`;

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
    `${cwd}\\cpp-core\\wasm\\wasm_bridge.cpp`
  ].filter((path) => fs.existsSync(path));
  const outputMtime = Math.min(fs.statSync(js).mtimeMs, fs.statSync(wasm).mtimeMs);
  return sources.every((path) => outputMtime >= fs.statSync(path).mtimeMs);
}

const describeWasm = wasmArtifactsAvailable() ? describe : describe.skip;

describeWasm("WasmCoreAdapter golden parity", () => {
  it("wasm assemble simple ready matches golden", async () => {
    const adapter = new WasmCoreAdapter();
    const result = await adapter.assemble(DEFAULT_CASL_SOURCE);

    expect(result.state).toEqual(simpleReady as CometStateDto);
    await adapter.dispose();
  });

  it("wasm step1 matches golden", async () => {
    const adapter = new WasmCoreAdapter();
    await adapter.assemble(DEFAULT_CASL_SOURCE);
    const result = await adapter.step();

    expect(result.state).toEqual(simpleStep1 as CometStateDto);
    await adapter.dispose();
  });

  it("wasm step2 matches golden", async () => {
    const adapter = new WasmCoreAdapter();
    await adapter.assemble(DEFAULT_CASL_SOURCE);
    await adapter.step();
    const result = await adapter.step();

    expect(result.state).toEqual(simpleStep2 as CometStateDto);
    await adapter.dispose();
  });

  it("wasm step3 matches golden", async () => {
    const adapter = new WasmCoreAdapter();
    await adapter.assemble(DEFAULT_CASL_SOURCE);
    await adapter.step();
    await adapter.step();
    const result = await adapter.step();

    expect(result.state).toEqual(simpleStep3 as CometStateDto);
    await adapter.dispose();
  });

  it("wasm GR2 step1 matches golden", async () => {
    const adapter = new WasmCoreAdapter();
    await adapter.assemble(gr2Source);
    const result = await adapter.step();

    expect(result.state).toEqual(gr2Step1 as CometStateDto);
    await adapter.dispose();
  });

  it("wasm LAD step1 matches golden", async () => {
    const adapter = new WasmCoreAdapter();
    await adapter.assemble(ladSource);
    const result = await adapter.step();

    expect(result.state).toEqual(ladaStep1 as CometStateDto);
    await adapter.dispose();
  });

  it("wasm SUBA step matches golden", async () => {
    const adapter = new WasmCoreAdapter();
    await adapter.assemble(subaSource);
    await adapter.step();
    const result = await adapter.step();

    expect(result.state).toEqual(subaStep1 as CometStateDto);
    await adapter.dispose();
  });

  it("wasm JZE taken matches golden", async () => {
    const adapter = new WasmCoreAdapter();
    await adapter.assemble(jzeTakenSource);
    await adapter.step();
    await adapter.step();
    const result = await adapter.step();

    expect(result.state).toEqual(jzeTaken as CometStateDto);
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
});
