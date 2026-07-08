import { test, expect } from "@playwright/test";
import { assemble, expectCurrentSourceInstruction, expectRegister, openStudio, step } from "./caslSmokeHelpers";

test("Mock backend completes assemble and first step in the browser UI", async ({ page }) => {
  await openStudio(page, "Mock Core");

  await expect(page.getByTestId("step-button")).toBeDisabled();
  await assemble(page);
  await expectRegister(page, "register-pr", "0020");
  await expectCurrentSourceInstruction(page, /LD\s+GR1,A/);

  await step(page);
  await expectRegister(page, "register-gr1", "000A");
  await expectRegister(page, "register-pr", "0022");
  await expectCurrentSourceInstruction(page, /ADDA\s+GR1,B/);
});
