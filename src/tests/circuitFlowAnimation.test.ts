import { describe, expect, it } from "vitest";

describe("circuit signal flow animation styles", () => {
  async function readRepoFile(relativePath: string): Promise<string> {
    const { readFileSync } = await import("node:fs");
    const { dirname, resolve } = await import("node:path");
    const { fileURLToPath } = await import("node:url");
    const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

    return readFileSync(resolve(root, relativePath), "utf8") as string;
  }

  it("reduced_motion_css_disables_flow_animation", async () => {
    const appCss = await readRepoFile("src/styles/app.css");

    expect(appCss).toContain(".circuit-wire--flow");
    expect(appCss).toContain("@media (prefers-reduced-motion: reduce)");
    expect(appCss).toContain("animation: none");
    expect(appCss).toContain("stroke-dashoffset: 0");
  });

  it("visual_review_static_disables_flow_animation", async () => {
    const appCss = await readRepoFile("src/styles/app.css");
    const visualReviewSpec = await readRepoFile("tests/e2e/visual-review.spec.ts");

    expect(appCss).toContain(".visual-review-static .circuit-wire--flow");
    expect(appCss).toContain("animation: none");
    expect(visualReviewSpec).toContain("visual-review-static");
    expect(visualReviewSpec).toContain("document.documentElement.classList.add");
    expect(visualReviewSpec).toContain("document.body.classList.add");
  });

  it("inactive_wires_do_not_animate", async () => {
    const appCss = await readRepoFile("src/styles/app.css");

    expect(appCss).toContain('[data-active="false"].circuit-wire--flow');
    expect(appCss).toContain("animation: none");
  });

  it("visual_review_covers_1280_viewport", async () => {
    const visualReviewSpec = await readRepoFile("tests/e2e/visual-review.spec.ts");

    expect(visualReviewSpec).toContain('name: "1280x720"');
  });
});
