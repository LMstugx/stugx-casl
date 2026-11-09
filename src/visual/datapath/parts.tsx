import { memo } from "react";
import type { ReactNode } from "react";
import { formatHex16 } from "../../utils/format";
import { GENERAL_REGISTER_COUNT, MEMORY_VISIBLE_ROWS, grRowY } from "./geometry";
import type {
  ControlSignalView,
  DatapathLabels,
  DatapathPartId,
  DecoderView,
  MemoryRowView,
  WordCell
} from "./model";

const CONTROLLER_SIGNAL_SLOTS = 5;
const SOURCE_TEXT_LIMIT = 15;
const EMPTY_WORD = "----";

type Pin = { x: number; y: number; orientation: "side" | "end" };

/** Stable identifiers of the parts. Tests and tools address a part by these, not by its drawing. */
const PART_TEST_ID: Readonly<Record<DatapathPartId, string>> = {
  ir: "module-ir",
  decoder: "module-decoder",
  controller: "module-controller",
  pr: "module-pr",
  sp: "module-sp",
  ea: "effective-address-unit",
  mux: "module-mux",
  mar: "module-mar",
  gr: "module-gr",
  alu: "module-alu",
  mdr: "module-mdr",
  fr: "module-fr",
  memory: "module-memory"
};

function PartGroup({ id, active, children }: { id: DatapathPartId; active: boolean; children: ReactNode }) {
  return (
    <g className="dp-part" data-part={id} data-testid={PART_TEST_ID[id]} data-active={active ? "true" : "false"}>
      {children}
    </g>
  );
}

function Pins({ pins }: { pins: readonly Pin[] }) {
  return (
    <>
      {pins.map((pin) =>
        pin.orientation === "side" ? (
          <rect key={`${pin.x}-${pin.y}`} className="dp-pin" x={pin.x} y={pin.y} width={4} height={9} rx={1} />
        ) : (
          <rect key={`${pin.x}-${pin.y}`} className="dp-pin" x={pin.x} y={pin.y} width={8} height={4} rx={1} />
        )
      )}
    </>
  );
}

function clip(text: string, limit: number): string {
  return text.length > limit ? `${text.slice(0, limit - 1)}…` : text;
}

interface RegisterPartProps {
  id: "pr" | "sp" | "mar" | "mdr";
  x: number;
  y: number;
  tag: string;
  cell: WordCell;
  active: boolean;
  pins: readonly Pin[];
  labels: Pick<DatapathLabels, "previousValue">;
}

/** One 16-bit register: body, pins, name, bit width, and a value window. */
export const RegisterPart = memo(function RegisterPart({ id, x, y, tag, cell, active, pins, labels }: RegisterPartProps) {
  const changed = cell.state === "changed";
  return (
    <PartGroup id={id} active={active}>
      <Pins pins={pins} />
      <rect className="dp-body" x={x} y={y} width={84} height={46} rx={6} />
      <text className="dp-tag" x={x + 8} y={y + 13}>
        {tag}
      </text>
      {changed && cell.previous !== undefined ? (
        <text className="dp-prev" data-previous-for={id} x={x + 76} y={y + 13} textAnchor="end">
          {labels.previousValue(formatHex16(cell.previous))}
        </text>
      ) : (
        <text className="dp-bits" x={x + 76} y={y + 13} textAnchor="end">
          16
        </text>
      )}
      <rect className="dp-win" data-cell-state={cell.state} x={x + 6} y={y + 18} width={72} height={22} rx={3} />
      <text className={changed ? "dp-val dp-val--changed" : "dp-val"} x={x + 42} y={y + 34} textAnchor="middle">
        {formatHex16(cell.value)}
      </text>
    </PartGroup>
  );
});

interface InstructionRegisterPartProps {
  word0: number | null;
  word1: number | null;
  active: boolean;
}

export const InstructionRegisterPart = memo(function InstructionRegisterPart({ word0, word1, active }: InstructionRegisterPartProps) {
  return (
    <PartGroup id="ir" active={active}>
      <Pins pins={[{ x: 111, y: 14, orientation: "end" }]} />
      <rect className="dp-body" x={40} y={20} width={150} height={46} rx={6} />
      <text className="dp-tag" x={48} y={33}>
        IR
      </text>
      <text className="dp-bits" x={182} y={33} textAnchor="end">
        32
      </text>
      <rect className="dp-win" data-cell-state="idle" x={46} y={38} width={67} height={22} rx={3} />
      <text className="dp-val dp-val--sm" x={79.5} y={54} textAnchor="middle">
        {word0 === null ? EMPTY_WORD : formatHex16(word0)}
      </text>
      <rect className="dp-win" data-cell-state="idle" x={117} y={38} width={67} height={22} rx={3} />
      <text className="dp-val dp-val--sm" x={150.5} y={54} textAnchor="middle">
        {word1 === null ? EMPTY_WORD : formatHex16(word1)}
      </text>
    </PartGroup>
  );
});

const DECODER_FIELDS = [
  { key: "op", name: "OP", x: 48, width: 36 },
  { key: "r", name: "r", x: 88, width: 22 },
  { key: "x", name: "x", x: 114, width: 22 },
  { key: "adr", name: "adr", x: 140, width: 44 }
] as const;

function decoderFieldValue(decoder: DecoderView | null, key: (typeof DECODER_FIELDS)[number]["key"]): string {
  if (!decoder) return "--";
  if (key === "op") return decoder.op.toString(16).toUpperCase().padStart(2, "0");
  if (key === "r") return decoder.r.toString(16).toUpperCase();
  if (key === "x") return decoder.x.toString(16).toUpperCase();
  return decoder.adr === null ? "--" : formatHex16(decoder.adr);
}

function decoderFieldMeaning(decoder: DecoderView | null, key: (typeof DECODER_FIELDS)[number]["key"]): string {
  if (!decoder) return "";
  if (key === "op") return decoder.opText;
  if (key === "r") return decoder.rText;
  if (key === "x") return decoder.xText;
  return decoder.adrText;
}

interface DecoderPartProps {
  decoder: DecoderView | null;
  active: boolean;
  labels: Pick<DatapathLabels, "decoder">;
}

/** Decoder: the four instruction fields, what each one means, and the field names. */
export const DecoderPart = memo(function DecoderPart({ decoder, active, labels }: DecoderPartProps) {
  return (
    <PartGroup id="decoder" active={active}>
      <rect className="dp-body" x={40} y={90} width={150} height={110} rx={6} />
      <text className="dp-tag" x={48} y={104}>
        {labels.decoder}
      </text>
      {DECODER_FIELDS.map((field) => {
        const center = field.x + field.width / 2;
        return (
          <g key={field.key} data-decoder-field={field.key}>
            <rect className="dp-win" data-cell-state={active ? "selected" : "idle"} x={field.x} y={114} width={field.width} height={24} rx={3} />
            <text className="dp-val dp-val--sm" x={center} y={131} textAnchor="middle">
              {decoderFieldValue(decoder, field.key)}
            </text>
            <text className="dp-key" x={center} y={152} textAnchor="middle">
              {clip(decoderFieldMeaning(decoder, field.key), 7)}
            </text>
            <text className="dp-key" x={center} y={166} textAnchor="middle">
              {field.name}
            </text>
          </g>
        );
      })}
    </PartGroup>
  );
});

interface ControllerPartProps {
  phaseText: string;
  instructionText: string;
  signals: readonly ControlSignalView[];
  active: boolean;
  labels: Pick<DatapathLabels, "controller">;
}

/** Controller: the control signals of this phase. An asserted signal is solid and bold, not only coloured. */
export const ControllerPart = memo(function ControllerPart({ phaseText, instructionText, signals, active, labels }: ControllerPartProps) {
  return (
    <PartGroup id="controller" active={active}>
      <rect className="dp-body" x={40} y={222} width={150} height={140} rx={6} />
      <text className="dp-tag" x={48} y={236}>
        {labels.controller}
      </text>
      <text className="dp-bits" x={182} y={236} textAnchor="end">
        {clip(phaseText, 16)}
      </text>
      {signals.slice(0, CONTROLLER_SIGNAL_SLOTS).map((signal, index) => {
        const y = 244 + index * 20;
        return (
          <g key={signal.id} className="dp-sig" data-signal={signal.id} data-asserted={signal.asserted ? "true" : "false"}>
            <rect x={48} y={y} width={134} height={16} rx={8} />
            <text x={58} y={y + 12}>
              {clip(signal.text, 19)}
            </text>
          </g>
        );
      })}
      <text className="dp-key" data-instruction={instructionText} x={48} y={354}>
        {clip(instructionText, 24)}
      </text>
    </PartGroup>
  );
});

interface RegisterFilePartProps {
  cells: readonly WordCell[];
  active: boolean;
  /** The register that supplies the index to the effective-address adder in this step, if any. */
  indexRegister?: number;
  labels: Pick<DatapathLabels, "previousValue">;
}

/** General registers GR0 to GR7 in one body, one value window per register. */
export const RegisterFilePart = memo(function RegisterFilePart({ cells, active, indexRegister, labels }: RegisterFilePartProps) {
  const changedIndex = cells.findIndex((cell) => cell.state === "changed" && cell.previous !== undefined);
  const changedCell = changedIndex >= 0 ? cells[changedIndex] : undefined;
  return (
    <PartGroup id="gr" active={active}>
      <rect className="dp-body" x={250} y={150} width={120} height={284} rx={6} />
      <text className="dp-tag" x={258} y={164}>
        GR
      </text>
      {changedCell?.previous !== undefined ? (
        <text className="dp-prev" data-previous-for={`gr${changedIndex}`} x={362} y={164} textAnchor="end">
          {`GR${changedIndex} ${labels.previousValue(formatHex16(changedCell.previous))}`}
        </text>
      ) : (
        <text className="dp-bits" x={362} y={164} textAnchor="end">
          8 × 16
        </text>
      )}
      {Array.from({ length: GENERAL_REGISTER_COUNT }, (_, index) => {
        const cell = cells[index] ?? { value: 0, state: "idle" as const };
        const center = grRowY(index);
        return (
          <g
            key={index}
            data-gr-row={index}
            data-testid={`register-gr${index}`}
            data-active={cell.state === "idle" ? "false" : "true"}
            data-index={index === indexRegister ? "true" : "false"}
          >
            <text className="dp-key" x={258} y={center + 4}>
              {index}
            </text>
            <rect className="dp-win" data-cell-state={cell.state} x={276} y={center - 12} width={86} height={24} rx={3} />
            <text className={cell.state === "changed" ? "dp-val dp-val--changed" : "dp-val"} x={319} y={center + 5} textAnchor="middle">
              {formatHex16(cell.value)}
            </text>
          </g>
        );
      })}
    </PartGroup>
  );
});

/** ALU drawn with the textbook notch. The badge shows the operation while the ALU is working. */
export const AluPart = memo(function AluPart({ operator }: { operator: string | null }) {
  return (
    <PartGroup id="alu" active={operator !== null}>
      <polygon className="dp-body" points="470,250 510,250 526,272 542,250 582,250 582,296 550,326 502,326 470,296" />
      <circle className="dp-op-badge" cx={526} cy={288} r={11} />
      <text className="dp-op" data-alu-operator={operator ?? ""} x={526} y={293} textAnchor="middle">
        {operator ?? "·"}
      </text>
      <text className="dp-key" x={478} y={264}>
        A
      </text>
      <text className="dp-key" x={568} y={264}>
        B
      </text>
      <text className="dp-tag" x={526} y={318} textAnchor="middle">
        ALU
      </text>
      <text className="dp-key" x={497} y={340}>
        Y
      </text>
      <text className="dp-key" x={566} y={342}>
        F
      </text>
    </PartGroup>
  );
});

/** Effective-address adder. It is separate from the ALU. */
export const EaAdderPart = memo(function EaAdderPart({ value, active }: { value: number | null; active: boolean }) {
  return (
    <PartGroup id="ea" active={active}>
      <circle className="dp-body" cx={408} cy={98} r={15} />
      <text className="dp-op" x={408} y={103} textAnchor="middle">
        +
      </text>
      <text className="dp-key" x={400} y={125}>
        EA
      </text>
      {value !== null ? (
        <text className="dp-val dp-val--xs" x={438} y={92}>
          {formatHex16(value)}
        </text>
      ) : null}
    </PartGroup>
  );
});

/** Selector in front of MAR. Its inputs are PR, SP, and EA. */
export const MuxPart = memo(function MuxPart({ selected, active }: { selected: "pr" | "sp" | "ea" | null; active: boolean }) {
  return (
    <PartGroup id="mux" active={active}>
      <polygon className="dp-body" points="446,24 460,30 460,56 446,62" />
      <text className="dp-key" x={440} y={20}>
        MUX
      </text>
      {selected ? (
        <text className="dp-key dp-key--strong" data-mux-selected={selected} x={453} y={76} textAnchor="middle">
          {selected.toUpperCase()}
        </text>
      ) : null}
    </PartGroup>
  );
});

const FLAG_BITS = [
  { key: "of", name: "OF", x: 500 },
  { key: "sf", name: "SF", x: 532 },
  { key: "zf", name: "ZF", x: 564 }
] as const;

/** Flag register with exactly three bits: OF, SF, ZF. A set bit is filled and bold. */
export const FlagRegisterPart = memo(function FlagRegisterPart({ flags, active }: { flags: { of: boolean; sf: boolean; zf: boolean }; active: boolean }) {
  return (
    <PartGroup id="fr" active={active}>
      <rect className="dp-body" x={470} y={356} width={124} height={52} rx={6} />
      <text className="dp-tag" x={478} y={370}>
        FR
      </text>
      <text className="dp-bits" x={586} y={370} textAnchor="end">
        3
      </text>
      {FLAG_BITS.map((bit) => {
        const lit = flags[bit.key];
        return (
          <g key={bit.key} data-flag={bit.key} data-lit={lit ? "true" : "false"}>
            <rect className="dp-bit" x={bit.x} y={374} width={28} height={28} rx={3} />
            <text className="dp-key" x={bit.x + 14} y={384} textAnchor="middle">
              {bit.name}
            </text>
            <text className="dp-bit-value" x={bit.x + 14} y={398} textAnchor="middle">
              {lit ? "1" : "0"}
            </text>
          </g>
        );
      })}
    </PartGroup>
  );
});

const MEMORY_PINS = [
  { key: "adr", name: "ADR", y: 39, textY: 47 },
  { key: "rd", name: "RD", y: 56, textY: 64 },
  { key: "wr", name: "WR", y: 70, textY: 78 },
  { key: "data", name: "DATA", y: 84, textY: 92 }
] as const;

interface MemoryChipPartProps {
  rows: readonly MemoryRowView[];
  pins: { adr: boolean; rd: boolean; wr: boolean; data: boolean };
  active: boolean;
  labels: Pick<DatapathLabels, "memory" | "memoryAddress" | "memoryValue" | "memoryLabel" | "memorySource" | "readMarker" | "writeMarker">;
}

/** Main memory drawn as a chip: ADR, RD, WR, and DATA pins on the left, a table of words inside. */
export const MemoryChipPart = memo(function MemoryChipPart({ rows, pins, active, labels }: MemoryChipPartProps) {
  const visibleRows = rows.slice(0, MEMORY_VISIBLE_ROWS);
  return (
    <PartGroup id="memory" active={active}>
      <rect className="dp-body" x={712} y={20} width={238} height={430} rx={6} />
      <text className="dp-tag" x={942} y={34} textAnchor="end">
        {`${labels.memory} 64K × 16`}
      </text>
      {MEMORY_PINS.map((pin) => (
        <g key={pin.key} data-memory-pin={pin.key} data-on={pins[pin.key] ? "true" : "false"}>
          <rect className="dp-mpin" x={708} y={pin.y} width={4} height={9} rx={1} />
          <text className="dp-key" x={720} y={pin.textY}>
            {pin.name}
          </text>
        </g>
      ))}
      <text className="dp-mem-head" x={720} y={106}>
        {labels.memoryAddress}
      </text>
      <text className="dp-mem-head" x={762} y={106}>
        {labels.memoryValue}
      </text>
      <text className="dp-mem-head" x={804} y={106}>
        {labels.memoryLabel}
      </text>
      <text className="dp-mem-head" x={846} y={106}>
        {labels.memorySource}
      </text>
      {visibleRows.map((row, index) => {
        const top = 114 + 26 * index;
        const rowClass = row.access === "read" ? "dp-row dp-row--read" : row.access === "write" ? "dp-row dp-row--write" : row.current ? "dp-row dp-row--current" : null;
        return rowClass ? <rect key={`bg-${row.address}`} className={rowClass} x={713} y={top} width={236} height={26} /> : null;
      })}
      <path className="dp-grid" d="M716 112H946M758 112V424M800 112V424M842 112V424" />
      {visibleRows.map((row, index) => {
        const baseline = 131 + 26 * index;
        return (
          <g
            key={row.address}
            data-memory-row={index}
            data-testid={`memory-row-${formatHex16(row.address)}`}
            data-address={formatHex16(row.address)}
            data-access={row.access ?? "none"}
            data-read={row.access === "read" ? "true" : "false"}
            data-write={row.access === "write" ? "true" : "false"}
          >
            <text className="dp-mem dp-mem--addr" x={720} y={baseline}>
              {formatHex16(row.address)}
            </text>
            <text className="dp-mem" x={762} y={baseline}>
              {formatHex16(row.value)}
            </text>
            {row.label ? (
              <text className="dp-mem dp-mem--label" x={804} y={baseline}>
                {clip(row.label, 6)}
              </text>
            ) : null}
            {row.access ? (
              <text className="dp-access" data-access={row.access} x={940} y={baseline} textAnchor="end" aria-label={row.access === "read" ? labels.readMarker : labels.writeMarker}>
                {row.access === "read" ? "R" : "W"}
              </text>
            ) : row.source ? (
              <text className="dp-mem" x={846} y={baseline}>
                {clip(row.source, SOURCE_TEXT_LIMIT)}
              </text>
            ) : null}
          </g>
        );
      })}
    </PartGroup>
  );
});
