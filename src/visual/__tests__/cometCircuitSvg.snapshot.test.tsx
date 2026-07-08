// @vitest-environment jsdom

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DEFAULT_CASL_SOURCE, mockCaslCore } from "../../core/mockCaslCore";
import { CometState } from "../../core/types";
import CometCircuitSvg from "../CometCircuitSvg";

type CircuitFixture = {
  name: string;
  state: CometState;
  activeWires: string[];
  currentLine: string;
  activeMemory?: string;
  activeRegister?: string;
};

function renderCircuit(state: CometState): Document {
  document.body.innerHTML = renderToStaticMarkup(<CometCircuitSvg state={state} />);
  return document;
}

function activeWireIds(doc: Document): string[] {
  return Array.from(doc.querySelectorAll<SVGPathElement>("[data-path-id][data-active='true']")).map((path) => path.dataset.pathId ?? "");
}

function buildFixtures(): CircuitFixture[] {
  const ready = mockCaslCore.assemble(DEFAULT_CASL_SOURCE);
  const afterLd = mockCaslCore.step(ready);
  const afterAdda = mockCaslCore.step(afterLd);
  const afterSt = mockCaslCore.step(afterAdda);
  const finished = mockCaslCore.step(afterSt);

  return [
    {
      name: "Ready",
      state: ready,
      activeWires: ["pr-to-mar"],
      currentLine: "2",
      activeMemory: "0020"
    },
    {
      name: "Step1 LD",
      state: afterLd,
      activeWires: ["memory-to-mdr", "mdr-to-gr"],
      currentLine: "3",
      activeMemory: "0027",
      activeRegister: "gr1"
    },
    {
      name: "Step2 ADDA",
      state: afterAdda,
      activeWires: ["gr-to-alu", "mdr-to-alu", "alu-to-gr", "alu-to-fr"],
      currentLine: "4",
      activeMemory: "0028",
      activeRegister: "gr1"
    },
    {
      name: "Step3 ST",
      state: afterSt,
      activeWires: ["gr-to-mdr", "mdr-to-memory"],
      currentLine: "5",
      activeMemory: "0029",
      activeRegister: "gr1"
    },
    {
      name: "Finished",
      state: finished,
      activeWires: [],
      currentLine: "5",
      activeMemory: "0026"
    }
  ];
}

describe("COMET circuit SVG visual regression structure", () => {
  it.each(buildFixtures())("renders required modules for $name", ({ state }) => {
    const doc = renderCircuit(state);

    expect(doc.querySelector("[data-testid='comet-circuit-svg']")).toBeTruthy();
    expect(doc.querySelector("[data-testid='module-pr']")).toBeTruthy();
    expect(doc.querySelector("[data-testid='module-gr']")).toBeTruthy();
    expect(doc.querySelector("[data-testid='module-memory']")).toBeTruthy();
    expect(doc.querySelector("[data-testid='module-mdr']")).toBeTruthy();
    expect(doc.querySelector("[data-testid='module-alu']")).toBeTruthy();
    expect(doc.querySelector("[data-testid='module-fr']")).toBeTruthy();
    expect(doc.querySelector("[data-testid='module-source-map']")).toBeTruthy();
  });

  it.each(buildFixtures())("marks active paths and highlights for $name", ({ state, activeWires, currentLine, activeMemory, activeRegister }) => {
    const doc = renderCircuit(state);

    expect(activeWireIds(doc).sort()).toEqual([...activeWires].sort());
    expect(doc.querySelector("[data-testid='source-map-highlight']")?.getAttribute("data-current-line")).toBe(currentLine);

    if (activeMemory) {
      expect(doc.querySelector(`[data-testid='memory-row-${activeMemory}']`)?.getAttribute("data-active")).toBe("true");
    }

    if (activeRegister) {
      expect(doc.querySelector(`[data-testid='register-${activeRegister}']`)?.getAttribute("data-active")).toBe("true");
    }
  });
});
