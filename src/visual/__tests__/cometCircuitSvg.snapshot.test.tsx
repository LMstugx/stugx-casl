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

function wireById(doc: Document, id: string): SVGPathElement | null {
  return doc.querySelector<SVGPathElement>(`[data-testid='wire-${id}']`) ?? doc.querySelector<SVGPathElement>(`[data-path-id='${id}'][data-active='true']`);
}

function activeDataWires(doc: Document): SVGPathElement[] {
  return Array.from(doc.querySelectorAll<SVGPathElement>("[data-active='true'][data-semantic-type='data']"));
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
      activeWires: ["mar-to-memory", "memory-to-mdr", "mdr-to-gr"],
      currentLine: "3",
      activeMemory: "0027",
      activeRegister: "gr1"
    },
    {
      name: "Step2 ADDA",
      state: afterAdda,
      activeWires: ["gr-to-alu", "mar-to-memory", "memory-to-mdr", "mdr-to-alu", "alu-to-gr", "alu-to-fr"],
      currentLine: "4",
      activeMemory: "0028",
      activeRegister: "gr1"
    },
    {
      name: "Step3 ST",
      state: afterSt,
      activeWires: ["gr-to-mdr", "mar-to-memory", "mdr-to-memory"],
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

  it("exposes row-level anchors and keeps SP outside active fetch path", () => {
    const doc = renderCircuit(mockCaslCore.assemble(DEFAULT_CASL_SOURCE));

    expect(doc.querySelector("[data-testid='module-ir']")?.getAttribute("data-layer")).toBe("control");
    expect(doc.querySelector("[data-testid='module-pr']")?.getAttribute("data-layer")).toBe("control");
    expect(doc.querySelector("[data-testid='module-sp']")?.getAttribute("data-layer")).toBe("control");
    expect(doc.querySelector("[data-testid='module-sp']")?.getAttribute("data-active")).toBe("false");
    expect(activeWireIds(doc)).toEqual(["pr-to-mar"]);
    expect(doc.querySelector("[data-path-id='sp-to-mar-preview']")?.getAttribute("data-active")).toBe("false");
    expect(doc.querySelector("[data-path-id='mar-to-stack-memory-preview']")?.getAttribute("data-active")).toBe("false");

    expect(doc.querySelector("[data-testid='sp-anchor-output']")).toBeTruthy();
    expect(doc.querySelector("[data-testid='sp-anchor-adjust']")).toBeTruthy();
    expect(doc.querySelector("[data-testid='gr-row-anchor-left-1']")).toBeTruthy();
    expect(doc.querySelector("[data-testid='gr-row-anchor-right-1']")).toBeTruthy();
    expect(doc.querySelector("[data-testid='memory-row-anchor-left-0020']")).toBeTruthy();
    expect(doc.querySelector("[data-testid='memory-row-anchor-right-0020']")).toBeTruthy();
    expect(doc.querySelector("[data-testid='alu-anchor-input-a']")).toBeTruthy();
    expect(doc.querySelector("[data-testid='alu-anchor-input-b']")).toBeTruthy();
    expect(doc.querySelector("[data-testid='alu-anchor-output-y']")).toBeTruthy();
    expect(doc.querySelector("[data-testid='alu-anchor-flag-out']")).toBeTruthy();
    expect(doc.querySelector("[data-testid='mdr-anchor-left']")).toBeTruthy();
    expect(doc.querySelector("[data-testid='mdr-anchor-right']")).toBeTruthy();
    expect(doc.querySelector("[data-testid='fr-anchor-input']")).toBeTruthy();
  });

  it("keeps circuit display inactive instead of showing PR as output", () => {
    const doc = renderCircuit(mockCaslCore.assemble(DEFAULT_CASL_SOURCE));

    expect(doc.querySelector("[data-testid='module-display']")?.textContent).toContain("No output");
    expect(doc.querySelector("[data-testid='module-display']")?.textContent).not.toContain("0020");
  });

  it("uses ALU/FR path for compare without GR writeback", () => {
    const source = `MAIN START
     LD    GR1,A
     CPA   GR1,B
     RET
A    DC    10
B    DC    10
     END`;
    let state = mockCaslCore.assemble(source);
    state = mockCaslCore.step(state);
    state = mockCaslCore.step(state);
    const doc = renderCircuit(state);
    const active = activeWireIds(doc);

    expect(active).toContain("gr-to-alu");
    expect(active).toContain("memory-to-mdr");
    expect(active).toContain("mdr-to-alu");
    expect(active).toContain("alu-to-fr");
    expect(active).not.toContain("alu-to-gr");
    expect(doc.querySelector("[data-testid='module-fr']")?.getAttribute("data-active")).toBe("true");
  });

  it("active_arrow_has_single_terminal_marker", () => {
    const ready = mockCaslCore.assemble(DEFAULT_CASL_SOURCE);
    const afterLd = mockCaslCore.step(ready);
    const doc = renderCircuit(afterLd);
    const activePaths = Array.from(doc.querySelectorAll<SVGPathElement>("[data-active='true'][data-path-id]"));

    expect(activePaths.length).toBeGreaterThan(0);
    for (const path of activePaths) {
      expect(path.getAttribute("marker-end")).toMatch(/^url\(#arrow-/);
      expect(path.getAttribute("marker-mid")).toBeNull();
    }
  });

  it("inactive_wires_are_not_primary_arrows", () => {
    const doc = renderCircuit(mockCaslCore.assemble(DEFAULT_CASL_SOURCE));
    const inactivePaths = Array.from(doc.querySelectorAll<SVGPathElement>("[data-active='false'][data-path-id]"));

    expect(inactivePaths.length).toBeGreaterThan(0);
    for (const path of inactivePaths) {
      expect(path.getAttribute("marker-end")).toBeNull();
      expect(path.getAttribute("marker-mid")).toBeNull();
    }
  });

  it("renders active junction dots for routed path corners", () => {
    const ready = mockCaslCore.assemble(DEFAULT_CASL_SOURCE);
    const afterLd = mockCaslCore.step(ready);
    const doc = renderCircuit(afterLd);

    expect(doc.querySelector("[data-testid='wire-junction-memory-to-mdr-0']")).toBeTruthy();
    expect(doc.querySelector("[data-testid='wire-junction-mdr-to-gr-0']")).toBeTruthy();
  });

  it("active_wire_has_flow_class and data_wire_gets_data_flow_class", () => {
    const afterLd = mockCaslCore.step(mockCaslCore.assemble(DEFAULT_CASL_SOURCE));
    const doc = renderCircuit(afterLd);
    const memoryToMdr = wireById(doc, "memory-to-mdr");

    expect(memoryToMdr?.classList.contains("circuit-wire--active")).toBe(true);
    expect(memoryToMdr?.classList.contains("circuit-wire--flow")).toBe(true);
    expect(memoryToMdr?.classList.contains("circuit-wire--data-flow")).toBe(true);
    expect(memoryToMdr?.classList.contains("circuit-wire--addr-flow")).toBe(false);
  });

  it("inactive_wire_has_no_flow_class", () => {
    const doc = renderCircuit(mockCaslCore.assemble(DEFAULT_CASL_SOURCE));
    const inactivePaths = Array.from(doc.querySelectorAll<SVGPathElement>("[data-active='false'][data-path-id]"));

    expect(inactivePaths.length).toBeGreaterThan(0);
    for (const path of inactivePaths) {
      expect(path.classList.contains("circuit-wire--flow")).toBe(false);
      expect(path.classList.contains("circuit-wire--active")).toBe(false);
    }
  });

  it("control_wire_gets_ctrl_flow_class", () => {
    const source = `MAIN START
     JUMP  TARGET
     LAD   GR1,0
TARGET RET
     END`;
    const afterJump = mockCaslCore.step(mockCaslCore.assemble(source));
    const doc = renderCircuit(afterJump);
    const controlWire = wireById(doc, "address-to-pr");

    expect(controlWire?.dataset.semanticType).toBe("control");
    expect(controlWire?.classList.contains("circuit-wire--flow")).toBe(true);
    expect(controlWire?.classList.contains("circuit-wire--ctrl-flow")).toBe(true);
    expect(controlWire?.classList.contains("circuit-wire--data-flow")).toBe(false);
  });

  it("flag_wire_gets_flag_flow_class", () => {
    const ready = mockCaslCore.assemble(DEFAULT_CASL_SOURCE);
    const afterLd = mockCaslCore.step(ready);
    const afterAdda = mockCaslCore.step(afterLd);
    const doc = renderCircuit(afterAdda);
    const flagWire = wireById(doc, "alu-to-fr");

    expect(flagWire?.dataset.semanticType).toBe("flag");
    expect(flagWire?.classList.contains("circuit-wire--flow")).toBe(true);
    expect(flagWire?.classList.contains("circuit-wire--flag-flow")).toBe(true);
  });

  it("ld_flow_does_not_activate_alu and st_flow_does_not_activate_alu", () => {
    const ready = mockCaslCore.assemble(DEFAULT_CASL_SOURCE);
    const afterLd = mockCaslCore.step(ready);
    const afterAdda = mockCaslCore.step(afterLd);
    const afterSt = mockCaslCore.step(afterAdda);
    const ldDoc = renderCircuit(afterLd);
    const stDoc = renderCircuit(afterSt);

    expect(activeDataWires(ldDoc).length).toBeGreaterThan(0);
    for (const wire of activeDataWires(ldDoc)) {
      expect(wire.classList.contains("circuit-wire--data-flow")).toBe(true);
    }
    expect(ldDoc.querySelector("[data-testid='module-alu']")?.getAttribute("data-active")).toBe("false");
    expect(activeWireIds(ldDoc)).not.toContain("gr-to-alu");

    expect(activeDataWires(stDoc).length).toBeGreaterThan(0);
    for (const wire of activeDataWires(stDoc)) {
      expect(wire.classList.contains("circuit-wire--data-flow")).toBe(true);
    }
    expect(stDoc.querySelector("[data-testid='module-alu']")?.getAttribute("data-active")).toBe("false");
    expect(activeWireIds(stDoc)).not.toContain("mdr-to-alu");
  });

  it("adda_flow_enters_alu", () => {
    const ready = mockCaslCore.assemble(DEFAULT_CASL_SOURCE);
    const afterLd = mockCaslCore.step(ready);
    const afterAdda = mockCaslCore.step(afterLd);
    const doc = renderCircuit(afterAdda);

    expect(doc.querySelector("[data-testid='module-alu']")?.getAttribute("data-active")).toBe("true");
    expect(wireById(doc, "gr-to-alu")?.classList.contains("circuit-wire--data-flow")).toBe(true);
    expect(wireById(doc, "mdr-to-alu")?.classList.contains("circuit-wire--data-flow")).toBe(true);
    expect(wireById(doc, "alu-to-gr")?.classList.contains("circuit-wire--data-flow")).toBe(true);
    expect(wireById(doc, "alu-to-fr")?.classList.contains("circuit-wire--flag-flow")).toBe(true);
  });

  it("shift_path_uses_shifter_badge_without_memory_read", () => {
    const source = `MAIN START
     LD    GR1,A
     SLL   GR1,1
     RET
A    DC    3
     END`;
    const afterLd = mockCaslCore.step(mockCaslCore.assemble(source));
    const afterShift = mockCaslCore.step(afterLd);
    const doc = renderCircuit(afterShift);

    expect(doc.querySelector("[data-testid='module-alu']")?.getAttribute("data-active")).toBe("true");
    expect(doc.querySelector("[data-testid='alu-shift-badge']")?.textContent).toContain("SLL");
    expect(activeWireIds(doc)).toEqual(["gr-to-alu", "shift-count-to-alu", "alu-to-gr", "alu-to-fr"]);
    expect(wireById(doc, "shift-count-to-alu")?.dataset.semanticType).toBe("address");
    expect(activeWireIds(doc)).not.toContain("memory-to-mdr");
    expect(doc.querySelector("[data-testid='module-mdr']")?.getAttribute("data-active")).toBe("false");
  });
});
