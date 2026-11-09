// @vitest-environment jsdom

import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DatapathCanvas } from "../DatapathCanvas";
import {
  DATAPATH_FIXTURES,
  addaWriteBackFixture,
  idleFixture,
  ldEffectiveAddressFixture,
  ldOperandReadFixture,
  stWriteFixture
} from "../fixtures";
import {
  CONTROL_LINES,
  GENERAL_REGISTER_COUNT,
  JUNCTIONS,
  MEMORY_VISIBLE_ROWS,
  PATH_TEMPLATES,
  STRUCTURAL_BUSES,
  pathSegments,
  pointOnPath,
  resolvePath,
  type DatapathPathId
} from "../geometry";
import type { DatapathLabels, DatapathViewModel } from "../model";
import { rewrittenRects } from "../motion";

const labels: DatapathLabels = {
  ariaLabel: "COMET II datapath",
  zoneControl: "Control",
  zoneAddress: "Address",
  zoneArithmetic: "Arithmetic",
  decoder: "Decoder",
  controller: "Controller",
  memory: "Memory",
  memoryAddress: "Addr",
  memoryValue: "Value",
  memoryLabel: "Label",
  memorySource: "Source",
  previousValue: (hex) => `was ${hex}`,
  readMarker: "read",
  writeMarker: "written"
};

const MARKER_ATTRIBUTES = ["marker-start", "marker-mid", "marker-end"] as const;

function render(model: DatapathViewModel): Document {
  document.body.innerHTML = renderToStaticMarkup(<DatapathCanvas model={model} labels={labels} />);
  return document;
}

function activePathIds(doc: Document): string[] {
  return Array.from(doc.querySelectorAll<SVGPathElement>("[data-path-id]")).map((path) => path.dataset.pathId ?? "");
}

function elementsWithAnyMarker(doc: Document): Element[] {
  return Array.from(doc.querySelectorAll("svg *")).filter((element) => MARKER_ATTRIBUTES.some((name) => element.hasAttribute(name)));
}

describe("workbench datapath structure", () => {
  it("renders one labelled svg with every part", () => {
    const doc = render(idleFixture);
    const svgs = doc.querySelectorAll("svg.dp");
    expect(svgs).toHaveLength(1);
    expect(svgs[0].getAttribute("role")).toBe("img");
    expect(svgs[0].getAttribute("aria-label")).toBe("COMET II datapath");

    const parts = Array.from(doc.querySelectorAll<SVGGElement>("[data-part]")).map((part) => part.dataset.part);
    expect(parts.sort()).toEqual(["alu", "controller", "decoder", "ea", "fr", "gr", "ir", "mar", "mdr", "memory", "mux", "pr", "sp"]);
  });

  it("flag register has exactly OF, SF, and ZF", () => {
    const doc = render(ldOperandReadFixture);
    const flags = Array.from(doc.querySelectorAll<SVGGElement>("[data-flag]")).map((flag) => flag.dataset.flag);
    expect(flags).toEqual(["of", "sf", "zf"]);
    expect(doc.querySelector("[data-flag='sf']")?.getAttribute("data-lit")).toBe("true");
    expect(doc.querySelector("[data-flag='sf'] .dp-bit-value")?.textContent).toBe("1");
    expect(doc.querySelector("[data-flag='of'] .dp-bit-value")?.textContent).toBe("0");
  });

  it("fixtures hold eight general registers and no more memory rows than the chip shows", () => {
    for (const fixture of Object.values(DATAPATH_FIXTURES)) {
      expect(fixture.gr).toHaveLength(GENERAL_REGISTER_COUNT);
      expect(fixture.memory.rows.length).toBeLessThanOrEqual(MEMORY_VISIBLE_ROWS);
    }
  });
});

describe("ADR 0023 rule 1: structural buses", () => {
  it("are all drawn in every state", () => {
    for (const fixture of Object.values(DATAPATH_FIXTURES)) {
      const doc = render(fixture);
      const ids = Array.from(doc.querySelectorAll<SVGPathElement>("[data-bus-id]")).map((bus) => bus.dataset.busId);
      expect(ids).toEqual(STRUCTURAL_BUSES.map((bus) => bus.id));
    }
  });

  it("never carry a marker and never change geometry", () => {
    const idle = render(idleFixture).querySelector("[data-layer='structural-buses']")?.innerHTML;
    const busy = render(ldOperandReadFixture);
    expect(busy.querySelector("[data-layer='structural-buses']")?.innerHTML).toBe(idle);
    for (const bus of Array.from(busy.querySelectorAll("[data-bus-id]"))) {
      for (const name of MARKER_ATTRIBUTES) expect(bus.hasAttribute(name)).toBe(false);
    }
  });
});

describe("ADR 0023 rule 2: junction dots", () => {
  it("lie on a structural bus segment and are the only circles used as wire markers", () => {
    const buses = STRUCTURAL_BUSES.map((bus) => bus.d);
    for (const junction of JUNCTIONS) {
      const carrying = buses.filter((d) => pointOnPath(d, junction.x, junction.y));
      // A junction is a split or merge: at least two buses meet there.
      expect(carrying.length, junction.id).toBeGreaterThanOrEqual(2);
    }
    const doc = render(ldOperandReadFixture);
    expect(doc.querySelectorAll("[data-junction]")).toHaveLength(JUNCTIONS.length);
    expect(doc.querySelectorAll("[data-part='memory'] circle")).toHaveLength(0);
  });

  it("take the kind of the active path that runs through them", () => {
    const doc = render(ldEffectiveAddressFixture);
    expect(doc.querySelector("[data-junction='gr-bus-ea']")?.getAttribute("data-kind")).toBe("address");
    expect(doc.querySelector("[data-junction='gr-bus-result']")?.getAttribute("data-kind")).toBe("none");
  });
});

describe("ADR 0023 rule 3: arrowheads", () => {
  it("an idle datapath renders no active path and no arrowhead", () => {
    const doc = render(idleFixture);
    expect(activePathIds(doc)).toEqual([]);
    expect(elementsWithAnyMarker(doc)).toEqual([]);
  });

  it("each active path ends with exactly one arrowhead and has no other marker", () => {
    const doc = render(ldOperandReadFixture);
    expect(activePathIds(doc)).toEqual(["mar-to-memory", "memory-to-mdr"]);
    for (const path of Array.from(doc.querySelectorAll("[data-path-id]"))) {
      const reference = path.getAttribute("marker-end") ?? "";
      const markerId = /^url\(#(.+)\)$/.exec(reference)?.[1];
      expect(markerId, reference).toBeTruthy();
      expect(doc.getElementById(markerId!)?.tagName.toLowerCase()).toBe("marker");
      expect(path.hasAttribute("marker-start")).toBe(false);
      expect(path.hasAttribute("marker-mid")).toBe(false);
    }
  });

  it("only active paths reference a marker", () => {
    for (const fixture of Object.values(DATAPATH_FIXTURES)) {
      const doc = render(fixture);
      for (const element of elementsWithAnyMarker(doc)) expect(element.hasAttribute("data-path-id")).toBe(true);
    }
  });
});

describe("ADR 0023 rule 4: active paths come from the view model only", () => {
  it("draws exactly the listed paths with their kinds", () => {
    const doc = render(ldEffectiveAddressFixture);
    const drawn = Array.from(doc.querySelectorAll<SVGPathElement>("[data-path-id]")).map((path) => [path.dataset.pathId, path.dataset.pathKind]);
    expect(drawn).toEqual([
      ["decoder-to-ea", "address"],
      ["gr-to-ea", "address"],
      ["ea-to-mux", "address"],
      ["mux-to-mar", "address"]
    ]);
  });

  it("drops a path whose row index is missing or out of range instead of guessing", () => {
    const doc = render({
      ...idleFixture,
      activePaths: [{ id: "gr-to-ea" }, { id: "gr-to-ea", grIndex: 8 }, { id: "memory-to-mdr" }, { id: "memory-to-mdr", memoryRow: 99 }, { id: "alu-to-gr", grIndex: -1 }]
    });
    expect(activePathIds(doc)).toEqual([]);
    expect(elementsWithAnyMarker(doc)).toEqual([]);
  });

  it("routes a register row path from that row", () => {
    expect(resolvePath("gr-to-ea", { grIndex: 1 })).toBe("M370 221H380V140H408V115");
    expect(resolvePath("gr-to-ea", { grIndex: 7 })).toBe("M370 401H380V140H408V115");
    expect(resolvePath("memory-to-mdr", { memoryRow: 7 })).toBe("M718 309H715V88H702V183H700");
    expect(resolvePath("mdr-to-memory", { memoryRow: 9 })).toBe("M698 183H702V88H715V361H718");
  });

  it("every route is orthogonal and has at least one segment", () => {
    for (const id of Object.keys(PATH_TEMPLATES) as DatapathPathId[]) {
      const d = resolvePath(id, { grIndex: 3, memoryRow: 5 });
      expect(d, id).not.toBeNull();
      const segments = pathSegments(d!);
      expect(segments.length, id).toBeGreaterThan(0);
      for (const segment of segments) expect(segment.x1 === segment.x2 || segment.y1 === segment.y2, id).toBe(true);
    }
  });
});

describe("ADR 0023 rule 5: state is never colour only", () => {
  it("a rewritten register shows its previous value as text", () => {
    const doc = render(ldOperandReadFixture);
    expect(doc.querySelector("[data-part='mdr'] .dp-win")?.getAttribute("data-cell-state")).toBe("changed");
    expect(doc.querySelector("[data-previous-for='mdr']")?.textContent).toBe("was 003B");
    expect(doc.querySelector("[data-part='mdr'] .dp-val")?.textContent).toBe("0007");
    expect(doc.querySelector("[data-previous-for='pr']")).toBeNull();
  });

  it("a rewritten general register names the register and its previous value", () => {
    const doc = render(addaWriteBackFixture);
    expect(doc.querySelector("[data-previous-for='gr1']")?.textContent).toBe("GR1 was 0005");
    expect(doc.querySelector("[data-gr-row='1'] .dp-win")?.getAttribute("data-cell-state")).toBe("changed");
    expect(doc.querySelector("[data-gr-row='1'] .dp-val")?.textContent).toBe("000B");
  });

  it("memory rows that are read or written carry the letters R and W", () => {
    const read = render(ldOperandReadFixture).querySelector("[data-memory-row='7']");
    expect(read?.getAttribute("data-address")).toBe("003C");
    expect(read?.querySelector(".dp-access")?.textContent).toBe("R");
    expect(read?.querySelector(".dp-access")?.getAttribute("aria-label")).toBe("read");

    const written = render(stWriteFixture).querySelector("[data-memory-row='9']");
    expect(written?.getAttribute("data-address")).toBe("0029");
    expect(written?.querySelector(".dp-access")?.textContent).toBe("W");
    expect(written?.querySelector(".dp-access")?.getAttribute("aria-label")).toBe("written");
  });

  it("memory pins follow the asserted lines", () => {
    const read = render(ldOperandReadFixture);
    expect(read.querySelector("[data-memory-pin='rd']")?.getAttribute("data-on")).toBe("true");
    expect(read.querySelector("[data-memory-pin='wr']")?.getAttribute("data-on")).toBe("false");
    const write = render(stWriteFixture);
    expect(write.querySelector("[data-memory-pin='wr']")?.getAttribute("data-on")).toBe("true");
    expect(write.querySelector("[data-memory-pin='rd']")?.getAttribute("data-on")).toBe("false");
  });
});

describe("ADR 0023 rule 6: control lines", () => {
  it("are all drawn, and only the asserted ones are marked asserted", () => {
    const doc = render(ldOperandReadFixture);
    const lines = Array.from(doc.querySelectorAll<SVGPathElement>("[data-control-line]"));
    expect(lines.map((line) => line.dataset.controlLine)).toEqual(Object.keys(CONTROL_LINES));
    expect(lines.filter((line) => line.dataset.asserted === "true").map((line) => line.dataset.controlLine)).toEqual(["mem-read"]);
    for (const line of lines) for (const name of MARKER_ATTRIBUTES) expect(line.hasAttribute(name)).toBe(false);
  });

  it("controller signals mark assertion as data, not only as a colour", () => {
    const doc = render(ldOperandReadFixture);
    const asserted = Array.from(doc.querySelectorAll<SVGGElement>(".dp-sig[data-asserted='true']")).map((signal) => signal.dataset.signal);
    expect(asserted).toEqual(["mem-read", "mdr-load"]);
  });
});

describe("path geometry helpers", () => {
  it("splits an orthogonal path into segments", () => {
    expect(pathSegments("M324 99H346V43H446")).toEqual([
      { x1: 324, y1: 99, x2: 346, y2: 99 },
      { x1: 346, y1: 99, x2: 346, y2: 43 },
      { x1: 346, y1: 43, x2: 446, y2: 43 }
    ]);
    expect(pathSegments("M75 200V222M155 200V222")).toHaveLength(2);
  });

  it("tells whether a point is on a path", () => {
    expect(pointOnPath("M380 140V440", 380, 270)).toBe(true);
    expect(pointOnPath("M380 140V440", 381, 270)).toBe(false);
    expect(pointOnPath("M380 140V440", 380, 441)).toBe(false);
  });
});

describe("datapath styles", () => {
  const datapathCss = readFileSync("src/styles/datapath.css", "utf8");
  const tokensCss = readFileSync("src/styles/tokens.css", "utf8");

  it("contain no literal colours", () => {
    const withoutComments = datapathCss.replace(/\/\*[\s\S]*?\*\//g, "");
    expect(withoutComments).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(withoutComments).not.toMatch(/\b(?:rgba?|hsla?)\(/);
  });

  it("use only tokens that tokens.css defines", () => {
    // --dp-* are per-element values set inline by the motion layer, not design tokens.
    const used = new Set(
      Array.from(datapathCss.matchAll(/var\((--[a-z0-9-]+)/g))
        .map((match) => match[1])
        .filter((token) => !token.startsWith("--dp-"))
    );
    expect(used.size).toBeGreaterThan(20);
    for (const token of used) expect(tokensCss, token).toContain(`${token}:`);
  });
});

function renderWithMotion(model: DatapathViewModel, stepKey: string | number = 1): Document {
  document.body.innerHTML = renderToStaticMarkup(<DatapathCanvas model={model} labels={labels} motion="play" stepKey={stepKey} />);
  return document;
}

const MOTION_SELECTOR = ".dp-token, .dp-flow, .dp-pulse, .dp-control--signal";

describe("ADR 0024: motion never adds information", () => {
  it("no motion element exists unless motion is requested", () => {
    for (const fixture of Object.values(DATAPATH_FIXTURES)) {
      const doc = render(fixture);
      expect(doc.querySelector("svg.dp")?.getAttribute("data-motion")).toBe("none");
      expect(doc.querySelector("[data-layer='motion']")).toBeNull();
      expect(doc.querySelectorAll(MOTION_SELECTOR)).toHaveLength(0);
      expect(doc.querySelectorAll("[pathLength]")).toHaveLength(0);
    }
  });

  it("removing the motion leaves exactly the still picture", () => {
    for (const fixture of Object.values(DATAPATH_FIXTURES)) {
      const still = render(fixture).querySelector("svg.dp")!.outerHTML;
      const moving = renderWithMotion(fixture).querySelector("svg.dp")!;
      moving.querySelector("[data-layer='motion']")?.remove();
      for (const line of Array.from(moving.querySelectorAll(".dp-control--signal"))) {
        line.classList.remove("dp-control--signal");
        line.removeAttribute("pathLength");
      }
      moving.setAttribute("data-motion", "none");
      expect(moving.outerHTML).toBe(still);
    }
  });

  it("an idle datapath has nothing to animate", () => {
    const doc = renderWithMotion(idleFixture);
    expect(doc.querySelector("[data-layer='motion']")?.children).toHaveLength(0);
    expect(doc.querySelectorAll(MOTION_SELECTOR)).toHaveLength(0);
  });

  it("structural buses, junctions, idle control lines, and parts never move", () => {
    const doc = renderWithMotion(ldOperandReadFixture);
    for (const element of Array.from(doc.querySelectorAll("[data-bus-id], [data-junction], [data-part], [data-part] *"))) {
      expect(element.matches(MOTION_SELECTOR)).toBe(false);
    }
    const idleLines = Array.from(doc.querySelectorAll("[data-control-line][data-asserted='false']"));
    expect(idleLines.length).toBeGreaterThan(0);
    for (const line of idleLines) {
      expect(line.classList.contains("dp-control--signal")).toBe(false);
      expect(line.hasAttribute("pathLength")).toBe(false);
    }
  });
});

describe("ADR 0024: signal, travel, arrival", () => {
  it("asserted control lines draw once from the controller", () => {
    const doc = renderWithMotion(ldOperandReadFixture);
    const signals = Array.from(doc.querySelectorAll<SVGPathElement>(".dp-control--signal"));
    expect(signals.map((line) => line.dataset.controlLine)).toEqual(["mem-read"]);
    expect(signals[0].getAttribute("pathLength")).toBe("1");
    expect(signals[0].dataset.asserted).toBe("true");
  });

  it("a token appears only on an active path that carries a word, shows that word, and follows the route", () => {
    const doc = renderWithMotion(ldEffectiveAddressFixture);
    const tokens = Array.from(doc.querySelectorAll<SVGGElement>(".dp-token"));
    expect(tokens.map((token) => [token.dataset.tokenFor, token.textContent])).toEqual([
      ["decoder-to-ea", "003B"],
      ["gr-to-ea", "0001"],
      ["ea-to-mux", "003C"]
    ]);
    // mux-to-mar is active but the model gives it no word, so it gets no token.
    expect(doc.querySelector("[data-token-for='mux-to-mar']")).toBeNull();
    for (const token of tokens) {
      const route = doc.querySelector(`[data-path-id='${token.dataset.tokenFor}']`)?.getAttribute("d");
      expect(token.getAttribute("style")).toContain(`path("${route}")`);
    }
  });

  it("every active path gets one flow overlay on the same route", () => {
    const doc = renderWithMotion(ldEffectiveAddressFixture);
    const flows = Array.from(doc.querySelectorAll<SVGPathElement>(".dp-flow"));
    const active = Array.from(doc.querySelectorAll<SVGPathElement>("[data-path-id]"));
    expect(flows.map((flow) => [flow.dataset.flowFor, flow.getAttribute("d")])).toEqual(active.map((path) => [path.dataset.pathId, path.getAttribute("d")]));
    for (const flow of flows) for (const name of MARKER_ATTRIBUTES) expect(flow.hasAttribute(name)).toBe(false);
  });

  it("stages order the tokens, and the rewritten value pulses after the last stage", () => {
    const doc = renderWithMotion(ldOperandReadFixture);
    const stages = Array.from(doc.querySelectorAll<SVGGElement>(".dp-token")).map((token) => [token.dataset.tokenFor, token.dataset.stage]);
    expect(stages).toEqual([
      ["mar-to-memory", "0"],
      ["memory-to-mdr", "1"]
    ]);
    const pulses = Array.from(doc.querySelectorAll<SVGRectElement>(".dp-pulse"));
    expect(pulses.map((pulse) => pulse.dataset.pulseFor)).toEqual(["mdr"]);
    expect(pulses[0].getAttribute("style")).toContain("--dp-stage:2");
  });

  it("each value the step rewrote pulses, and nothing else does", () => {
    const pulseIds = (model: DatapathViewModel) => Array.from(renderWithMotion(model).querySelectorAll<SVGRectElement>(".dp-pulse")).map((pulse) => pulse.dataset.pulseFor);
    expect(pulseIds(ldEffectiveAddressFixture)).toEqual(["mar"]);
    expect(pulseIds(addaWriteBackFixture)).toEqual(["gr1"]);
    expect(pulseIds(stWriteFixture)).toEqual(["memory-row-9"]);
    expect(pulseIds(DATAPATH_FIXTURES["adda-execute"])).toEqual([]);
  });

  it("a pulse sits exactly on the window or row it marks", () => {
    expect(rewrittenRects(ldOperandReadFixture)).toEqual([{ id: "mdr", x: 616, y: 178, width: 72, height: 22 }]);
    expect(rewrittenRects(addaWriteBackFixture)).toEqual([{ id: "gr1", x: 276, y: 209, width: 86, height: 24 }]);
    expect(rewrittenRects(stWriteFixture)).toEqual([{ id: "memory-row-9", x: 713, y: 348, width: 236, height: 26 }]);
    expect(rewrittenRects(idleFixture)).toEqual([]);
  });
});

describe("ADR 0024: motion can always be removed", () => {
  const datapathCss = readFileSync("src/styles/datapath.css", "utf8").replace(/\/\*[\s\S]*?\*\//g, "");

  function ruleBody(selector: string): string {
    const start = datapathCss.indexOf(`\n${selector} {`);
    expect(start, selector).toBeGreaterThanOrEqual(0);
    return datapathCss.slice(start, datapathCss.indexOf("}", start));
  }

  it("motion-only elements are invisible unless their animation runs", () => {
    for (const selector of [".dp-flow", ".dp-token", ".dp-pulse"]) expect(ruleBody(selector), selector).toContain("opacity: 0;");
  });

  it("only the four motion classes animate", () => {
    const rules = datapathCss.split("}").filter((rule) => /\banimation(?:-delay)?\s*:/.test(rule) && !/animation:\s*none/.test(rule));
    expect(rules.length).toBeGreaterThanOrEqual(4);
    for (const rule of rules) expect(rule.slice(0, rule.indexOf("{"))).toMatch(/\.dp-(?:control--signal|flow|token|pulse)\s*$/);
  });

  it("reduced motion and static review switch every animation off", () => {
    const reduced = datapathCss.slice(datapathCss.indexOf("@media (prefers-reduced-motion: reduce)"));
    for (const selector of [".dp-control--signal", ".dp-flow", ".dp-token", ".dp-pulse"]) {
      expect(reduced, selector).toContain(selector);
      expect(datapathCss, selector).toContain(`.visual-review-static ${selector}`);
    }
    expect(reduced).toContain("animation: none;");
  });
});
