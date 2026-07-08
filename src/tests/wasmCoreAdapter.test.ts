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

type NodeFsSync = {
  existsSync(path: string): boolean;
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

function wasmArtifactsAvailable(): boolean {
  const processLike = (globalThis as { process?: { cwd?: () => string; getBuiltinModule?: (name: string) => NodeFsSync } }).process;
  const cwd = processLike?.cwd?.();
  const fs = processLike?.getBuiltinModule?.("fs");
  if (!cwd || !fs) return false;
  return fs.existsSync(`${cwd}\\public\\wasm\\stugx_casl_core.js`) && fs.existsSync(`${cwd}\\public\\wasm\\stugx_casl_core.wasm`);
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
});
