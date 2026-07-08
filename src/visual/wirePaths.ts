import { VisualPathKind } from "../core/types";

export type WireRole = "control" | "data" | "inactive";

export type WirePath = {
  id: string;
  role: WireRole;
  d: string;
};

export const wirePaths: readonly WirePath[] = Object.freeze([
  { id: "pr-to-mar", role: "control", d: "M 442 71 C 535 71 655 71 760 71" },
  { id: "pr-to-plus2", role: "control", d: "M 442 71 L 476 71" },
  { id: "plus2-to-sp", role: "control", d: "M 576 71 L 612 71" },
  { id: "sp-to-mar", role: "control", d: "M 732 71 L 760 71" },
  { id: "mar-to-memory", role: "control", d: "M 892 71 C 930 74 930 150 944 150" },
  { id: "memory-to-mdr", role: "data", d: "M 944 280 C 924 280 926 284 926 284" },
  { id: "mdr-to-gr", role: "data", d: "M 810 284 C 720 284 620 306 464 306" },
  { id: "gr-to-mdr", role: "data", d: "M 464 334 C 590 340 708 318 810 284" },
  { id: "mdr-to-memory", role: "data", d: "M 926 284 C 936 300 936 330 944 330" },
  { id: "gr-to-alu", role: "data", d: "M 464 262 C 506 262 514 246 546 246" },
  { id: "mdr-to-alu", role: "data", d: "M 810 284 C 790 284 790 284 776 284" },
  { id: "alu-to-gr", role: "data", d: "M 546 350 C 510 350 502 378 464 378" },
  { id: "alu-to-fr", role: "control", d: "M 662 398 L 662 450" },
  { id: "address-to-gr", role: "data", d: "M 760 104 C 690 130 572 214 464 244" },
  { id: "address-to-pr", role: "control", d: "M 760 58 C 650 22 500 36 442 62" },
  { id: "ir-to-decoder", role: "control", d: "M 112 108 L 112 132" },
  { id: "decoder-to-controller", role: "control", d: "M 112 244 L 112 270" },
  { id: "controller-to-pr", role: "control", d: "M 186 316 C 236 318 246 71 322 71" },
  { id: "source-to-display", role: "inactive", d: "M 548 492 C 578 492 578 484 590 484" }
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
