export function formatHex16(value: number): string {
  return (value & 0xffff).toString(16).toUpperCase().padStart(4, "0");
}

export function formatSigned16(value: number): string {
  const word = value & 0xffff;
  const signed = word >= 0x8000 ? word - 0x10000 : word;
  return signed.toString(10);
}

export function formatFr(of: boolean, sf: boolean, zf: boolean): string {
  return `${of ? "OF1" : "OF0"} ${sf ? "SF1" : "SF0"} ${zf ? "ZF1" : "ZF0"}`;
}
