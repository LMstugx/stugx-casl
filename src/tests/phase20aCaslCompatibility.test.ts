import { describe, expect, it } from "vitest";
import { formatCaslWord, signedWordValue } from "../core/caslNumericFormat";
import { explainMachineCodeRow, selectMachineCodeRows } from "../core/machineCodeRows";
import { mockCaslCore } from "../core/mockCaslCore";

const officialMachineInstructions = [
  "NOP", "LD", "ST", "LAD",
  "ADDA", "SUBA", "ADDL", "SUBL",
  "AND", "OR", "XOR", "CPA", "CPL",
  "SLA", "SRA", "SLL", "SRL",
  "JMI", "JNZ", "JZE", "JUMP", "JPL", "JOV",
  "PUSH", "POP", "CALL", "RET", "SVC"
] as const;

const registerFormWords = {
  LD: 0x1412,
  ADDA: 0x2412,
  SUBA: 0x2512,
  ADDL: 0x2612,
  SUBL: 0x2712,
  AND: 0x3412,
  OR: 0x3512,
  XOR: 0x3612,
  CPA: 0x4412,
  CPL: 0x4512
} as const;

function stepCount(source: string, count: number) {
  let state = mockCaslCore.assemble(source);
  for (let index = 0; index < count; index += 1) state = mockCaslCore.step(state);
  return state;
}

describe("Phase 20A CASL II compatibility", () => {
  it("every_official_opcode_is_registered_and_assemblable", () => {
    const source = `MAIN START
     NOP
     LD GR1,DATA
     ST GR1,DATA
     LAD GR1,DATA
     ADDA GR1,DATA
     SUBA GR1,DATA
     ADDL GR1,DATA
     SUBL GR1,DATA
     AND GR1,DATA
     OR GR1,DATA
     XOR GR1,DATA
     CPA GR1,DATA
     CPL GR1,DATA
     SLA GR1,1
     SRA GR1,1
     SLL GR1,1
     SRL GR1,1
     JMI TARGET
     JNZ TARGET
     JZE TARGET
     JUMP TARGET
TARGET JPL TARGET2
     JOV TARGET2
     PUSH 0,GR1
     POP GR1
     CALL TARGET2
TARGET2 RET
     SVC 2
DATA DC 1
     END`;
    const state = mockCaslCore.assemble(source);

    expect(state.runState).toBe("Ready");
    expect(new Set(state.program?.map((instruction) => instruction.op))).toEqual(new Set(officialMachineInstructions));
  });

  it("every_register_register_form_uses_the_official_single_word_opcode", () => {
    const lines = Object.keys(registerFormWords).map((op) => `     ${op} GR1,GR2`).join("\n");
    const state = mockCaslCore.assemble(`MAIN START\n${lines}\n     RET\n     END`);

    expect(state.runState).toBe("Ready");
    const words = state.program?.slice(0, 10).map((instruction) => state.memory[instruction.address]);
    expect(words).toEqual(Object.values(registerFormWords));
    expect(state.program?.slice(0, 10).every((instruction) => instruction.size === 1 && instruction.sourceRegister === 2)).toBe(true);
  });

  it("register_form_execution_does_not_create_a_data_memory_read", () => {
    const source = `MAIN START
     LAD GR2,#1234
     LD GR1,GR2
     RET
     END`;
    const state = stepCount(source, 2);

    expect(state.gr[1]).toBe(0x1234);
    expect(state.lastMemoryReadAddress).toBeUndefined();
    expect(state.lastEffectiveAddress).toBeUndefined();
    const row = selectMachineCodeRows(state).find((candidate) => candidate.instruction === "LD");
    expect(row?.sourceRegister).toBe(2);
    expect(row?.operandAddress).toBeUndefined();
    expect(explainMachineCodeRow(row!).meaning).toContain("no data-memory operand");
  });

  it("start_entry_point_and_end_rules_are_enforced", () => {
    const entry = mockCaslCore.assemble(`MAIN START ENTRY
DATA DC 1
ENTRY RET
     END`);
    expect(entry.runState).toBe("Ready");
    expect(entry.entryPoint).toBe(entry.symbols.ENTRY);
    expect(entry.pr).toBe(entry.symbols.ENTRY);

    expect(mockCaslCore.assemble("MAIN START\n RET\n EXTRA END\n RET").runState).toBe("Error");
    expect(mockCaslCore.assemble("MAIN START\n RET\n SECOND START\n END").runState).toBe("Error");
  });

  it("dc_supports_address_multi_string_and_escaped_quote_constants", () => {
    const state = mockCaslCore.assemble(`MAIN START
TARGET DC #1234
PTR DC TARGET
TEXT DC -1,65536,'A''B'
     END`);

    expect(state.runState).toBe("Ready");
    expect(state.memory[state.symbols.PTR]).toBe(state.symbols.TARGET);
    expect([0, 1, 2, 3, 4].map((offset) => state.memory[state.symbols.TEXT + offset])).toEqual([0xffff, 0x0000, 0x0041, 0x0027, 0x0042]);
  });

  it("decimal_hex_and_character_literals_generate_owned_dc_storage", () => {
    const state = mockCaslCore.assemble(`MAIN START
STL00001 DC 9
     LD GR1,=10
     LD GR2,=#1234
     LD GR3,='A'
     RET
     END`);

    expect(state.runState).toBe("Ready");
    expect(state.symbols.STL00002).toBeDefined();
    expect(state.memory[state.symbols.STL00002]).toBe(10);
    expect(state.memory[state.symbols.STL00003]).toBe(0x1234);
    expect(state.memory[state.symbols.STL00004]).toBe(0x0041);
    expect(state.sourceMap.filter((entry) => /^STL/.test(entry.label ?? "")).every((entry) => entry.source.includes("LD") || entry.label === "STL00001")).toBe(true);
  });

  it("rpush_rpop_expand_in_standard_order_and_restore_sp", () => {
    const source = `MAIN START
     RPUSH
     RPOP
     RET
     END`;
    const assembled = mockCaslCore.assemble(source);
    expect(assembled.program?.slice(0, 7).map((instruction) => instruction.op)).toEqual(Array(7).fill("PUSH"));
    expect(assembled.program?.slice(7, 14).map((instruction) => instruction.gr)).toEqual([7, 6, 5, 4, 3, 2, 1]);
    const finished = stepCount(source, 14);
    expect(finished.sp).toBe(0xfffe);
  });

  it("in_out_waiting_is_nonblocking_and_uses_plain_text_records", () => {
    const source = `MAIN START
     IN BUF,LEN
     OUT BUF,LEN
     RET
BUF DS 256
LEN DS 1
     END`;
    let state = mockCaslCore.assemble(source);
    for (let index = 0; index < 5; index += 1) state = mockCaslCore.step(state);
    expect(state.runState).toBe("WaitingInput");
    expect(state.pr).toBe(state.program?.[4].address);

    state = mockCaslCore.enqueueInput(state, [0x41, 0x42, 0x43]);
    state = mockCaslCore.step(state);
    expect(state.memory[state.symbols.LEN]).toBe(3);
    expect([0, 1, 2].map((offset) => state.memory[state.symbols.BUF + offset])).toEqual([0x41, 0x42, 0x43]);

    for (let index = 0; index < 16 && state.runState !== "Finished"; index += 1) state = mockCaslCore.step(state);
    expect(state.consoleOutput).toEqual(["ABC"]);
    expect(state.sp).toBe(0xfffe);
  });

  it("input_eof_writes_ffff_length", () => {
    const source = `MAIN START
     IN BUF,LEN
     RET
BUF DS 256
LEN DS 1
     END`;
    let state = mockCaslCore.assemble(source);
    for (let index = 0; index < 5; index += 1) state = mockCaslCore.step(state);
    expect(state.runState).toBe("WaitingInput");

    state = mockCaslCore.enqueueInput(state, [], true);
    state = mockCaslCore.step(state);
    expect(state.memory[state.symbols.LEN]).toBe(0xffff);
    expect(state.runState).toBe("Ready");
  });

  it("reload_initialization_changes_only_ds_words", () => {
    const source = `MAIN START
     LAD GR1,#4321
     ST GR1,SPACE
     RET
CONST DC #1234
SPACE DS 2
     END`;
    let state = stepCount(source, 2);
    expect(state.memory[state.symbols.SPACE]).toBe(0x4321);

    state = mockCaslCore.reload(state, "ffff");
    expect(state.memory[state.symbols.CONST]).toBe(0x1234);
    expect(state.memory[state.symbols.SPACE]).toBe(0xffff);
    expect(state.memory[state.symbols.SPACE + 1]).toBe(0xffff);
    expect(state.gr).toEqual(Array(8).fill(0));
    expect(state.sp).toBe(0xfffe);
    expect(state.consoleOutput).toEqual([]);
    expect(state.trace).toEqual([]);
  });

  it("numeric_formats_preserve_the_same_16_bit_word", () => {
    expect(formatCaslWord(0xffff, "hex")).toBe("#FFFF");
    expect(formatCaslWord(0xffff, "signed")).toBe("-1");
    expect(formatCaslWord(0xffff, "unsigned")).toBe("65535");
    expect(formatCaslWord(0xffff, "binary")).toBe("1111 1111 1111 1111");
    expect(signedWordValue(0x8000)).toBe(-32768);
  });

  it("macro_source_mapping_groups_real_expanded_instructions", () => {
    const state = mockCaslCore.assemble(`MAIN START
     RPUSH
     RET
     END`);
    const macroRows = state.sourceMap.filter((entry) => entry.line === 2);
    expect(macroRows).toHaveLength(7);
    expect(macroRows.every((entry) => entry.source.trim() === "RPUSH")).toBe(true);
    expect(macroRows.every((entry) => entry.machineWords.length === 2)).toBe(true);
  });
});
