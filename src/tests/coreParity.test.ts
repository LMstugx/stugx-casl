import { describe, expect, it } from "vitest";
import gr2Step1 from "../../tests/golden/gr2.step1.json";
import simpleFinished from "../../tests/golden/simple.finished.json";
import simpleReady from "../../tests/golden/simple.ready.json";
import simpleStep1 from "../../tests/golden/simple.step1.json";
import simpleStep2 from "../../tests/golden/simple.step2.json";
import simpleStep3 from "../../tests/golden/simple.step3.json";
import { normalizeCoreStateForGolden, type CometStateDto } from "../core/coreDto";
import { DEFAULT_CASL_SOURCE, mockCaslCore } from "../core/mockCaslCore";

const gr2Source = `MAIN START
     LD    GR2,X
     ADDA  GR2,Y
     ST    GR2,Z
     RET
X    DC    3
Y    DC    4
Z    DS    1
     END`;

function expectGolden(actual: CometStateDto, expected: CometStateDto) {
  expect(actual).toEqual(expected);
}

describe("core golden parity", () => {
  it("simple program ready matches golden", () => {
    const state = mockCaslCore.assemble(DEFAULT_CASL_SOURCE);

    expectGolden(normalizeCoreStateForGolden(state), simpleReady as CometStateDto);
  });

  it("simple program step1 matches golden", () => {
    const state = mockCaslCore.step(mockCaslCore.assemble(DEFAULT_CASL_SOURCE));

    expectGolden(normalizeCoreStateForGolden(state), simpleStep1 as CometStateDto);
  });

  it("simple program step2 matches golden", () => {
    const ready = mockCaslCore.assemble(DEFAULT_CASL_SOURCE);
    const step1 = mockCaslCore.step(ready);
    const step2 = mockCaslCore.step(step1);

    expectGolden(normalizeCoreStateForGolden(step2), simpleStep2 as CometStateDto);
  });

  it("simple program step3 matches golden", () => {
    const ready = mockCaslCore.assemble(DEFAULT_CASL_SOURCE);
    const step1 = mockCaslCore.step(ready);
    const step2 = mockCaslCore.step(step1);
    const step3 = mockCaslCore.step(step2);

    expectGolden(normalizeCoreStateForGolden(step3), simpleStep3 as CometStateDto);
  });

  it("simple program finished matches golden", () => {
    let state = mockCaslCore.assemble(DEFAULT_CASL_SOURCE);
    state = mockCaslCore.step(state);
    state = mockCaslCore.step(state);
    state = mockCaslCore.step(state);
    state = mockCaslCore.step(state);

    expectGolden(normalizeCoreStateForGolden(state), simpleFinished as CometStateDto);
  });

  it("GR2 program step1 matches golden", () => {
    const state = mockCaslCore.step(mockCaslCore.assemble(gr2Source));

    expectGolden(normalizeCoreStateForGolden(state), gr2Step1 as CometStateDto);
  });
});
