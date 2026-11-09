// @vitest-environment jsdom

import { act, useEffect } from "react";
import { createRoot, type Root } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { PhasePills } from "../PhasePills";
import { WorkbenchShell, type WorkbenchLayout, type WorkbenchShellProps } from "../WorkbenchShell";

const labels = { code: "Source", datapath: "Datapath", observation: "Observation", dock: "Output", controls: "Controls" };

function shell(overrides: Partial<WorkbenchShellProps> = {}) {
  return (
    <WorkbenchShell
      topBar={<span data-slot="top">top</span>}
      codePane={<span data-slot="code">code</span>}
      datapathPane={<span data-slot="datapath">datapath</span>}
      observationPane={<span data-slot="observation">observation</span>}
      dock={<span data-slot="dock">dock</span>}
      controls={<span data-slot="controls">controls</span>}
      layout="show-both"
      codeOpen
      dockOpen
      labels={labels}
      {...overrides}
    />
  );
}

function renderStatic(overrides: Partial<WorkbenchShellProps> = {}): Document {
  document.body.innerHTML = renderToStaticMarkup(shell(overrides));
  return document;
}

describe("workbench shell regions", () => {
  it("puts every slot in a labelled region", () => {
    const doc = renderStatic();
    expect(doc.querySelector(".wb-code")?.getAttribute("aria-label")).toBe("Source");
    expect(doc.querySelector(".wb-datapath")?.getAttribute("aria-label")).toBe("Datapath");
    expect(doc.querySelector(".wb-observation")?.getAttribute("aria-label")).toBe("Observation");
    expect(doc.querySelector(".wb-dock")?.getAttribute("aria-label")).toBe("Output");
    expect(doc.querySelector(".wb-controls")?.getAttribute("aria-label")).toBe("Controls");
    for (const slot of ["top", "code", "datapath", "observation", "dock", "controls"]) {
      expect(doc.querySelector(`[data-slot='${slot}']`), slot).not.toBeNull();
    }
  });

  it("show-both shows everything", () => {
    const doc = renderStatic();
    expect(doc.querySelector(".wb")?.getAttribute("data-layout")).toBe("show-both");
    expect(doc.querySelectorAll(".wb-pane[hidden]")).toHaveLength(0);
  });

  it("circuit-focus hides the other panes but keeps them mounted", () => {
    const doc = renderStatic({ layout: "circuit-focus" });
    expect(doc.querySelector(".wb-datapath")?.hasAttribute("hidden")).toBe(false);
    for (const pane of [".wb-code", ".wb-observation", ".wb-dock"]) {
      expect(doc.querySelector(pane)?.hasAttribute("hidden"), pane).toBe(true);
    }
    for (const slot of ["code", "observation", "dock"]) expect(doc.querySelector(`[data-slot='${slot}']`), slot).not.toBeNull();
    expect(doc.querySelector(".wb-controls")?.hasAttribute("hidden")).toBe(false);
  });

  it("data-focus keeps the datapath and the observation pane", () => {
    const doc = renderStatic({ layout: "data-focus" });
    expect(doc.querySelector(".wb-datapath")?.hasAttribute("hidden")).toBe(false);
    expect(doc.querySelector(".wb-observation")?.hasAttribute("hidden")).toBe(false);
  });

  it("closing the source pane or the dock hides only that pane", () => {
    const doc = renderStatic({ codeOpen: false, dockOpen: false });
    expect(doc.querySelector(".wb")?.getAttribute("data-code")).toBe("closed");
    expect(doc.querySelector(".wb")?.getAttribute("data-dock")).toBe("closed");
    expect(doc.querySelector(".wb-code")?.hasAttribute("hidden")).toBe(true);
    expect(doc.querySelector(".wb-dock")?.hasAttribute("hidden")).toBe(true);
    expect(doc.querySelector(".wb-observation")?.hasAttribute("hidden")).toBe(false);
  });

  it("the datapath pane keeps the same position in every layout", () => {
    for (const layout of ["show-both", "circuit-focus", "data-focus"] as WorkbenchLayout[]) {
      const main = renderStatic({ layout }).querySelector(".wb-main");
      const classes = Array.from(main?.children ?? []).map((child) => child.className);
      expect(classes, layout).toEqual(["wb-pane wb-code", "wb-pane wb-datapath", "wb-pane wb-observation"]);
    }
  });
});

describe("workbench shell keeps the datapath mounted", () => {
  let root: Root;
  let container: HTMLDivElement;
  let mounts = 0;

  function MountCounter() {
    useEffect(() => {
      mounts += 1;
    }, []);
    return <span data-slot="datapath">datapath</span>;
  }

  beforeEach(() => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    mounts = 0;
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
  });

  it("layout, source pane, and dock changes never remount it", async () => {
    const steps: Partial<WorkbenchShellProps>[] = [
      {},
      { layout: "circuit-focus" },
      { layout: "data-focus" },
      { layout: "show-both", codeOpen: false },
      { layout: "show-both", dockOpen: false },
      { layout: "circuit-focus", codeOpen: false, dockOpen: false },
      {}
    ];
    for (const step of steps) {
      await act(async () => root.render(shell({ datapathPane: <MountCounter />, ...step })));
    }
    expect(mounts).toBe(1);
    expect(container.querySelector("[data-slot='datapath']")).not.toBeNull();
  });
});

describe("phase pills", () => {
  const pillLabels = { list: "Instruction phases", position: (index: number, total: number) => `Phase ${index} of ${total}`, done: "done" };
  const phases = ["fetch", "decode", "effective-address", "operand-read"].map((id) => ({ id, text: id }));

  function renderPills(currentIndex: number): Document {
    document.body.innerHTML = renderToStaticMarkup(<PhasePills phases={phases} currentIndex={currentIndex} labels={pillLabels} />);
    return document;
  }

  it("marks finished, current, and pending phases with text, not colour alone", () => {
    const doc = renderPills(2);
    const states = Array.from(doc.querySelectorAll<HTMLLIElement>(".wb-phase")).map((pill) => pill.dataset.state);
    expect(states).toEqual(["done", "done", "current", "pending"]);
    expect(doc.querySelector("ol")?.getAttribute("aria-label")).toBe("Instruction phases");

    const done = doc.querySelector("[data-phase='fetch']");
    expect(done?.querySelector(".wb-phase-check")).not.toBeNull();
    expect(done?.textContent).toContain("done");

    const current = doc.querySelector("[data-phase='effective-address']");
    expect(current?.getAttribute("aria-current")).toBe("step");
    expect(current?.querySelector(".wb-phase-position")?.textContent).toBe("3/4");
    expect(current?.getAttribute("title")).toBe("Phase 3 of 4");

    expect(doc.querySelector("[data-phase='operand-read']")?.hasAttribute("aria-current")).toBe(false);
  });

  it("shows every phase as pending when no instruction is in progress", () => {
    const doc = renderPills(-1);
    const states = Array.from(doc.querySelectorAll<HTMLLIElement>(".wb-phase")).map((pill) => pill.dataset.state);
    expect(states).toEqual(["pending", "pending", "pending", "pending"]);
    expect(doc.querySelector("[aria-current]")).toBeNull();
  });

  it("renders nothing but the list when the plan is empty", () => {
    document.body.innerHTML = renderToStaticMarkup(<PhasePills phases={[]} currentIndex={-1} labels={pillLabels} />);
    expect(document.querySelectorAll(".wb-phase")).toHaveLength(0);
  });
});
