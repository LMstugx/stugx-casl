import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Architecture boundary of the v2 workbench (docs/refactor/v2-refactor-standard.md, 1.3 and 6.3)
 * and the documentation that ADR 0023 requires.
 */

function sourceFiles(directory: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(directory)) {
    const path = join(directory, entry);
    if (statSync(path).isDirectory()) {
      if (entry !== "__tests__") files.push(...sourceFiles(path));
    } else if (/\.tsx?$/.test(entry) && !/\.test\.tsx?$/.test(entry)) {
      files.push(path.replace(/\\/g, "/"));
    }
  }
  return files;
}

function importSpecifiers(file: string): string[] {
  const text = readFileSync(file, "utf8");
  return Array.from(text.matchAll(/(?:from\s+|import\s*\(\s*|import\s+)["']([^"']+)["']/g)).map((match) => match[1]);
}

const FORBIDDEN = /(?:mockCaslCore|mockCoreAdapter|instructionEncoding|caslLinker|coreBridge|wasmLoader|wasmCoreAdapter|useAppStore)$/;

describe("v2 workbench presentation code derives no machine state", () => {
  const presentationFiles = [...sourceFiles("src/visual/datapath"), ...sourceFiles("src/components/workbench")];

  it("exists", () => {
    expect(presentationFiles).toContain("src/visual/datapath/DatapathCanvas.tsx");
    expect(presentationFiles).toContain("src/components/workbench/CircuitCanvas.tsx");
    expect(presentationFiles).toContain("src/components/workbench/ControlBar.tsx");
  });

  it("imports no core implementation, bridge, or store", () => {
    for (const file of presentationFiles) {
      for (const specifier of importSpecifiers(file)) expect(specifier, file).not.toMatch(FORBIDDEN);
    }
  });

  it("fixtures are used only by tests", () => {
    const users = sourceFiles("src").filter((file) => importSpecifiers(file).some((specifier) => /datapath\/fixtures$|^\.\/fixtures$/.test(specifier)));
    expect(users).toEqual([]);
  });
});

/**
 * The real prohibition behind the Phase 20G freeze: the application source opens no network
 * connection. This check reads the code itself, so it keeps holding after the UI changes.
 */
describe("production source makes no network request", () => {
  const NETWORK_API = /\bfetch\s*\(|\bXMLHttpRequest\b|\bnew\s+WebSocket\b|\bEventSource\b|\bsendBeacon\b/;

  it("uses no network API anywhere outside tests", () => {
    const offenders = sourceFiles("src").filter((file) => !file.startsWith("src/tests/") && NETWORK_API.test(readFileSync(file, "utf8")));
    expect(offenders).toEqual([]);
  });
});

// The phase 1 preview page is gone: the application itself is the workbench now.
describe("no development-only page ships", () => {
  it("the entry point loads nothing by query string and nothing from src/dev", () => {
    const main = readFileSync("src/main.tsx", "utf8");
    expect(main).not.toContain("URLSearchParams");
    expect(main).not.toContain("./dev/");
    expect(sourceFiles("src").filter((file) => file.startsWith("src/dev/"))).toEqual([]);
  });
});

describe("ADR 0023 documentation", () => {
  const adr = readFileSync("docs/adr/0023-workbench-datapath-structural-buses-and-active-arrowheads.md", "utf8");
  const adrIndex = readFileSync("docs/adr/README.md", "utf8");
  const cleanWireAdr = readFileSync("docs/adr/0003-clean-wire-visual-contract.md", "utf8");
  const contract = readFileSync("docs/circuit-visual-contract.md", "utf8");
  const keyboard = readFileSync("docs/reference/keyboard-accessibility.md", "utf8");

  it("is a canonical record that is indexed and linked from the record it supersedes", () => {
    for (const field of ["- Audience:", "- Status: Canonical", "- Last reviewed version: 1.0.0", "- Classification: Canonical", "- Related:"]) {
      expect(adr).toContain(field);
    }
    expect(adrIndex).toContain("0023-workbench-datapath-structural-buses-and-active-arrowheads.md");
    expect(cleanWireAdr).toContain("0023-workbench-datapath-structural-buses-and-active-arrowheads.md");
    expect(cleanWireAdr).toContain("continues to bind `CometCircuitSvg`");
  });

  it("the visual contract keeps both rule sets and never mixes them", () => {
    expect(contract).toContain("## 8. Wire Direction Rules (supersedes Arrowless Wire Rules)");
    expect(contract).toContain("### 8.1 Workbench Datapath");
    expect(contract).toContain("### 8.2 Legacy Circuit Focus Component");
    expect(contract).toContain("An idle datapath renders no arrowhead at all.");
    expect(contract).toContain("Active wires must not render terminal arrow markers");
    expect(contract.indexOf("### 8.1 Workbench Datapath")).toBeLessThan(contract.indexOf("### 8.2 Legacy Circuit Focus Component"));
  });

  it("motion is recorded in its own canonical record and in the contract", () => {
    const motionAdr = readFileSync("docs/adr/0024-workbench-datapath-motion.md", "utf8");
    for (const field of ["- Audience:", "- Status: Canonical", "- Last reviewed version: 1.0.0", "- Classification: Canonical", "- Related:"]) {
      expect(motionAdr).toContain(field);
    }
    expect(motionAdr).toContain("Motion never adds information.");
    expect(motionAdr).toContain("A reverse step plays no motion.");
    expect(adrIndex).toContain("0024-workbench-datapath-motion.md");
    expect(adr).toContain("0024-workbench-datapath-motion.md");
    expect(contract).toContain("adr/0024-workbench-datapath-motion.md");
    expect(contract).toContain("A reverse step plays no motion and nothing ever plays backward.");
  });

  it("workbench shortcuts are registered in the keyboard reference", () => {
    expect(keyboard).toContain("## Workbench Shortcuts");
    for (const key of ["| Space |", "| Shift+Space |", "| F5 |", "| F6 |", "| Ctrl+Enter |", "| Ctrl+S |"]) expect(keyboard).toContain(key);
    expect(keyboard).toContain("A shortcut never bypasses a disabled control.");
  });
});
