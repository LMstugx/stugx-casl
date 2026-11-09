import { useMemo } from "react";
import { useI18n } from "../../i18n/useI18n";
import type { DatapathLabels } from "./model";

/** Localised strings for the datapath. Register names, addresses, and mnemonics are never translated. */
export function useDatapathLabels(): DatapathLabels {
  const { t } = useI18n();
  return useMemo<DatapathLabels>(
    () => ({
      ariaLabel: t("datapath.ariaLabel"),
      zoneControl: t("datapath.zone.control"),
      zoneAddress: t("datapath.zone.address"),
      zoneArithmetic: t("datapath.zone.arithmetic"),
      decoder: t("datapath.part.decoder"),
      controller: t("datapath.part.controller"),
      memory: t("datapath.part.memory"),
      memoryAddress: t("datapath.memory.address"),
      memoryValue: t("datapath.memory.value"),
      memoryLabel: t("datapath.memory.label"),
      memorySource: t("datapath.memory.source"),
      previousValue: (hex: string) => t("datapath.previousValue", { value: hex }),
      readMarker: t("datapath.memory.read"),
      writeMarker: t("datapath.memory.write")
    }),
    [t]
  );
}
