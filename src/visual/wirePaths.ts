import { VisualPathKind } from "../core/types";

export type WireRole = "control" | "data" | "inactive";

export type WirePath = {
  id: string;
  role: WireRole;
  d: string;
};

export const wirePaths: readonly WirePath[] = Object.freeze([
  { id: "pr-to-mar", role: "control", d: "M 466 82 C 560 82 700 82 808 82" },
  { id: "pr-to-plus2", role: "control", d: "M 466 82 L 502 82" },
  { id: "plus2-to-sp", role: "control", d: "M 600 82 L 640 82" },
  { id: "sp-to-mar", role: "control", d: "M 756 82 L 808 82" },
  { id: "mar-to-memory", role: "control", d: "M 934 82 C 982 82 982 164 996 164" },
  { id: "memory-to-mdr", role: "data", d: "M 996 278 C 972 278 972 298 962 298" },
  { id: "mdr-to-gr", role: "data", d: "M 852 298 C 760 298 760 318 480 318" },
  { id: "gr-to-mdr", role: "data", d: "M 480 350 C 616 350 746 330 852 298" },
  { id: "mdr-to-memory", role: "data", d: "M 962 298 C 980 298 980 340 996 340" },
  { id: "gr-to-alu", role: "data", d: "M 480 286 C 548 286 562 272 610 272" },
  { id: "mdr-to-alu", role: "data", d: "M 852 298 C 820 298 820 300 800 300" },
  { id: "alu-to-gr", role: "data", d: "M 610 356 C 554 356 542 384 480 384" },
  { id: "alu-to-fr", role: "control", d: "M 706 402 L 706 478" },
  { id: "address-to-gr", role: "data", d: "M 808 108 C 704 142 590 220 480 254" },
  { id: "address-to-pr", role: "control", d: "M 808 66 C 670 28 518 44 466 72" },
  { id: "ir-to-decoder", role: "control", d: "M 117 118 L 117 150" },
  { id: "decoder-to-controller", role: "control", d: "M 117 266 L 117 300" },
  { id: "controller-to-pr", role: "control", d: "M 190 346 C 244 346 248 82 350 82" },
  { id: "source-to-display", role: "inactive", d: "M 536 548 C 580 548 580 520 610 520" }
]);

export const activeWireIdsByKind: Record<VisualPathKind, string[]> = {
  [VisualPathKind.None]: [],
  [VisualPathKind.Ready_PrToMar]: ["pr-to-mar"],
  [VisualPathKind.LD_MemoryToMdrToGr]: ["memory-to-mdr", "mdr-to-gr"],
  [VisualPathKind.ST_GrToMdrToMemory]: ["gr-to-mdr", "mdr-to-memory"],
  [VisualPathKind.ADDA_GrMdrToAluToGr]: ["gr-to-alu", "mdr-to-alu", "alu-to-gr", "alu-to-fr"],
  [VisualPathKind.LAD_AddressToGr]: ["pr-to-mar", "address-to-gr"],
  [VisualPathKind.SUBA_GrMdrToAluToGr]: ["gr-to-alu", "mdr-to-alu", "alu-to-gr", "alu-to-fr"],
  [VisualPathKind.CPA_GrMdrToAluToFr]: ["gr-to-alu", "mdr-to-alu", "alu-to-fr"],
  [VisualPathKind.Jump_AddressToPr]: ["pr-to-mar", "address-to-pr"],
  [VisualPathKind.ConditionalJump_AddressToPr]: ["pr-to-mar", "address-to-pr"],
  [VisualPathKind.ConditionalJump_NotTaken]: ["pr-to-plus2"],
  [VisualPathKind.Finished_None]: []
};
