import { describe, expect, it } from "vitest";
import {
  binary64ToWords,
  decodeBinary64Words,
  encodeNumberToBinary64,
  formatBinary64Binary,
  formatBinary64Hex,
  wordsToBinary64
} from "../doubleRepresentation";

describe("binary64 teaching representation", () => {
  it("encodes 3.5 as high-word-first binary64", () => {
    const value = encodeNumberToBinary64(3.5);
    expect(value.hex).toBe("400C000000000000");
    expect(value.words).toEqual([0x400c, 0x0000, 0x0000, 0x0000]);
    expect(value.classification).toBe("normal");
    expect(value.sign).toBe(0);
  });

  it("encodes -1.25 as high-word-first binary64", () => {
    const value = encodeNumberToBinary64(-1.25);
    expect(value.hex).toBe("BFF4000000000000");
    expect(value.words).toEqual([0xbff4, 0x0000, 0x0000, 0x0000]);
    expect(value.sign).toBe(1);
  });

  it("distinguishes positive and negative zero", () => {
    expect(encodeNumberToBinary64(0).classification).toBe("positive-zero");
    const negative = encodeNumberToBinary64(-0);
    expect(negative.classification).toBe("negative-zero");
    expect(negative.hex).toBe("8000000000000000");
    expect(Object.is(negative.decodedValue, -0)).toBe(true);
  });

  it.each([
    [[0x0000, 0x0000, 0x0000, 0x0001] as const, "subnormal"],
    [[0x7ff0, 0x0000, 0x0000, 0x0000] as const, "positive-infinity"],
    [[0xfff0, 0x0000, 0x0000, 0x0000] as const, "negative-infinity"],
    [[0x7ff8, 0x0000, 0x0000, 0x0001] as const, "nan"]
  ])("decodes classification for %j", (words, classification) => {
    expect(decodeBinary64Words(words).classification).toBe(classification);
  });

  it("round-trips arbitrary words without host-endian assumptions", () => {
    const words = [0x1234, 0xabcd, 0x00ff, 0x8001] as const;
    const raw = wordsToBinary64(words);
    expect(binary64ToWords(raw)).toEqual(words);
    expect(formatBinary64Hex(raw)).toBe("1234ABCD00FF8001");
    expect(formatBinary64Binary(raw).replace(/ /g, "")).toHaveLength(64);
  });
});
