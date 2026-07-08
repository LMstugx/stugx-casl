import { CometState, formatFlags, formatWord } from "../core/types";

export function summarizeCurrentInstruction(state: CometState): string {
  return state.currentInstruction ?? (state.runState === "Finished" ? "Finished" : "No instruction");
}

export function registerValueText(state: CometState, name: string): string {
  if (name === "FR") return formatFlags(state.fr);
  const row = state.registers.find((register) => register.name === name);
  return row ? formatWord(row.value) : "0000";
}
