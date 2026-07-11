import { formatWord } from "../core/types";
import type { DiagnosticParamValue } from "./types";

export function formatDiagnosticParam(name: string, value: DiagnosticParamValue): string | number {
  if (name === "address" && typeof value === "number") return formatWord(value);
  if (name === "line" || name === "column" || name.endsWith("Count") || name === "stepLimit" || name === "minimum" || name === "maximum") {
    return typeof value === "number" ? value : String(value);
  }
  return String(value);
}
