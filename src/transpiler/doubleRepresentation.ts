export type Binary64Classification =
  | "positive-zero"
  | "negative-zero"
  | "subnormal"
  | "normal"
  | "positive-infinity"
  | "negative-infinity"
  | "nan";

export type Binary64Words = readonly [number, number, number, number];

export interface Binary64Representation {
  readonly rawBits: bigint;
  readonly hex: string;
  readonly words: Binary64Words;
  readonly sign: 0 | 1;
  readonly exponentBits: number;
  readonly unbiasedExponent: number | null;
  readonly fractionBits: bigint;
  readonly classification: Binary64Classification;
  readonly decodedValue: number;
}

const RAW_BITS_MASK = 0xffff_ffff_ffff_ffffn;
const FRACTION_MASK = 0x000f_ffff_ffff_ffffn;
const EXPONENT_BIAS = 1023;

export function encodeNumberToBinary64(value: number): Binary64Representation {
  const buffer = new ArrayBuffer(8);
  const view = new DataView(buffer);
  view.setFloat64(0, value, false);
  return representationFromRawBits(view.getBigUint64(0, false));
}

export function decodeBinary64Words(words: Binary64Words): Binary64Representation {
  return representationFromRawBits(wordsToBinary64(words));
}

export function binary64ToWords(rawBits: bigint): Binary64Words {
  const normalized = rawBits & RAW_BITS_MASK;
  return [
    Number((normalized >> 48n) & 0xffffn),
    Number((normalized >> 32n) & 0xffffn),
    Number((normalized >> 16n) & 0xffffn),
    Number(normalized & 0xffffn)
  ];
}

export function wordsToBinary64(words: Binary64Words): bigint {
  return words.reduce((raw, word, index) => {
    const shift = BigInt((3 - index) * 16);
    return raw | (BigInt(word & 0xffff) << shift);
  }, 0n);
}

export function formatBinary64Hex(value: bigint | Binary64Words): string {
  const rawBits = typeof value === "bigint" ? value : wordsToBinary64(value);
  return (rawBits & RAW_BITS_MASK).toString(16).toUpperCase().padStart(16, "0");
}

export function formatBinary64Binary(value: bigint | Binary64Words): string {
  const rawBits = typeof value === "bigint" ? value : wordsToBinary64(value);
  const bits = (rawBits & RAW_BITS_MASK).toString(2).padStart(64, "0");
  return bits.match(/.{1,16}/g)?.join(" ") ?? bits;
}

function representationFromRawBits(rawBits: bigint): Binary64Representation {
  const normalized = rawBits & RAW_BITS_MASK;
  const sign = Number((normalized >> 63n) & 1n) as 0 | 1;
  const exponentBits = Number((normalized >> 52n) & 0x7ffn);
  const fractionBits = normalized & FRACTION_MASK;
  const classification = classify(sign, exponentBits, fractionBits);
  const buffer = new ArrayBuffer(8);
  const view = new DataView(buffer);
  view.setBigUint64(0, normalized, false);

  return {
    rawBits: normalized,
    hex: formatBinary64Hex(normalized),
    words: binary64ToWords(normalized),
    sign,
    exponentBits,
    unbiasedExponent: exponentBits === 0 || exponentBits === 0x7ff ? null : exponentBits - EXPONENT_BIAS,
    fractionBits,
    classification,
    decodedValue: view.getFloat64(0, false)
  };
}

function classify(sign: 0 | 1, exponentBits: number, fractionBits: bigint): Binary64Classification {
  if (exponentBits === 0) {
    if (fractionBits === 0n) return sign === 1 ? "negative-zero" : "positive-zero";
    return "subnormal";
  }
  if (exponentBits === 0x7ff) {
    if (fractionBits !== 0n) return "nan";
    return sign === 1 ? "negative-infinity" : "positive-infinity";
  }
  return "normal";
}
