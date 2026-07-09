import { describe, expect, it } from "vitest";
import gitignore from "../../.gitignore?raw";
import packageJsonRaw from "../../package.json?raw";
import visualReviewDoc from "../../docs/visual-review.md?raw";
import captureScript from "../../scripts/capture-visual-review.ps1?raw";
import serveScript from "../../scripts/serve-visual-review.ps1?raw";
import visualReviewSpec from "../../tests/e2e/visual-review.spec.ts?raw";

describe("visual review screenshot gallery setup", () => {
  it("visual_review_spec_exists", () => {
    expect(visualReviewSpec).toContain("visual review screenshot gallery");
    expect(visualReviewSpec).toContain("project-overview.png");
    expect(visualReviewSpec).toContain("casl-gr2-ld.png");
    expect(visualReviewSpec).toContain("enterCircuitFocusMode");
    expect(visualReviewSpec).toContain("logical-add-compare-jov.png");
    expect(visualReviewSpec).toContain("shift-operations-circuit.png");
    expect(visualReviewSpec).toContain("shift-operations-machine-code.png");
    expect(visualReviewSpec).toContain("stack-preview-focus.png");
    expect(visualReviewSpec).toContain("push-pop-stack-circuit.png");
    expect(visualReviewSpec).toContain("push-pop-stack-machine-code.png");
    expect(visualReviewSpec).toContain("call-return-call.png");
    expect(visualReviewSpec).toContain("call-return-ret-stack.png");
    expect(visualReviewSpec).toContain("call-return-finish.png");
    expect(visualReviewSpec).toContain("call-return-machine-code.png");
    expect(visualReviewSpec).toContain("nested-call-return.png");
    expect(visualReviewSpec).toContain("page.screenshot");
  });

  it("capture_visual_review_script_exists", () => {
    expect(captureScript).toContain("pnpm visual:review");
    expect(captureScript).toContain("artifacts\\visual-review");
    expect(captureScript).toContain("index.html");
  });

  it("serve_visual_review_script_exists", () => {
    expect(serveScript).toContain("http.server");
    expect(serveScript).toContain("Local URL");
    expect(serveScript).toContain("LAN URL");
    expect(serveScript).toContain("Stop-Process");
  });

  it("visual_review_docs_exist", () => {
    expect(visualReviewDoc).toContain("Visual Review Screenshot Gallery");
    expect(visualReviewDoc).toContain("pnpm visual:capture");
    expect(visualReviewDoc).toContain("phone");
    expect(visualReviewDoc).toContain("Memory arrow points to the active memory row");
    expect(visualReviewDoc).toContain("Active wires use a single terminal arrow");
    expect(visualReviewDoc).toContain("visual-review-static");
    expect(visualReviewDoc).toContain("freeze that animation");
    expect(visualReviewDoc).toContain("Junction dots are visible");
    expect(visualReviewDoc).toContain("DATA BUS");
    expect(visualReviewDoc).toContain("LD / ST data-bypass paths avoid the ALU body");
    expect(visualReviewDoc).toContain("ST writeback lands at the Memory row edge");
    expect(visualReviewDoc).toContain("Signal Probe is compact");
    expect(visualReviewDoc).toContain("Stack Preview is compact");
    expect(visualReviewDoc).toContain("active for stack instructions and stack-aware returns");
    expect(visualReviewDoc).toContain("PUSH / POP screenshots show");
    expect(visualReviewDoc).toContain("CALL / RET screenshots show");
    expect(visualReviewDoc).toContain("Circuit Focus screenshots include Program, Display, Current Instruction");
    expect(visualReviewDoc).toContain("stack-preview-focus.png");
    expect(visualReviewDoc).toContain("push-pop-stack-circuit.png");
    expect(visualReviewDoc).toContain("push-pop-stack-machine-code.png");
    expect(visualReviewDoc).toContain("call-return-call.png");
    expect(visualReviewDoc).toContain("call-return-ret-stack.png");
    expect(visualReviewDoc).toContain("call-return-finish.png");
    expect(visualReviewDoc).toContain("call-return-machine-code.png");
    expect(visualReviewDoc).toContain("nested-call-return.png");
  });

  it("package_json_has_visual_review_scripts", () => {
    const packageJson = JSON.parse(packageJsonRaw) as { scripts: Record<string, string> };

    expect(packageJson.scripts["visual:review"]).toContain("E2E_BACKEND='visual-review'");
    expect(packageJson.scripts["visual:review"]).toContain("playwright test tests/e2e/visual-review.spec.ts");
    expect(packageJson.scripts["visual:capture"]).toContain("capture-visual-review.ps1");
    expect(packageJson.scripts["visual:serve"]).toContain("serve-visual-review.ps1");
  });

  it("gitignore_excludes_visual_review_artifacts", () => {
    expect(gitignore).toContain("artifacts/visual-review/");
    expect(gitignore).toContain("artifacts/screenshots/");
  });
});
