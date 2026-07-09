import { describe, expect, it } from "vitest";
import { WasmCoreAdapter } from "../core/wasmCoreAdapter";

type NodeFsSync = {
  existsSync(path: string): boolean;
  statSync(path: string): { mtimeMs: number };
};

const simpleSource = `MAIN START
     LAD   GR1,1
     RET
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

const describeWasmStress = wasmArtifactsAvailable() ? describe : describe.skip;

describeWasmStress("WASM repeated lifecycle stress", () => {
  it("wasm_repeated_create_assemble_step_destroy_has_no_stale_state", async () => {
    for (let index = 0; index < 20; index += 1) {
      const adapter = new WasmCoreAdapter();
      const ready = await adapter.assemble(simpleSource);
      expect(ready.ok).toBe(true);
      expect(ready.state.gr[1]).toBe(0);

      const stepped = await adapter.step();
      expect(stepped.state.gr[1]).toBe(1);
      expect(stepped.state.stepCount).toBe(1);
      await adapter.dispose();
    }
  });

  it("wasm_repeated_invalid_source_returns_diagnostics_without_crashing", async () => {
    for (let index = 0; index < 20; index += 1) {
      const adapter = new WasmCoreAdapter();
      const result = await adapter.assemble("");
      expect(result.ok).toBe(false);
      expect(result.state.runState).toBe("Error");
      expect(result.diagnostics.length).toBeGreaterThan(0);
      await adapter.dispose();
    }
  });

  it("wasm_repeated_call_return_run_and_reset_clears_call_depth", async () => {
    for (let index = 0; index < 10; index += 1) {
      const adapter = new WasmCoreAdapter();
      await adapter.assemble(callReturnSource);
      const result = await adapter.run(40);
      expect(result.runState).toBe("Finished");
      expect(result.gr[1]).toBe(6);
      expect(result.callDepth).toBe(0);

      const reset = await adapter.reset();
      expect(reset.runState).toBe("Ready");
      expect(reset.callDepth).toBe(0);
      expect(reset.stepCount).toBe(0);
      await adapter.dispose();
    }
  });
});
