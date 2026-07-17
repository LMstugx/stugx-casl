import { demoPrograms } from "./demoPrograms";

export type LearningLevel = "CASL basics" | "C++ to CASL" | "Control flow" | "Loops" | "Machine code";
export type RecommendedTab = "Generated CASL" | "Machine Code" | "Trace" | "Memory" | "Output";

export type LearningStep = {
  stepId: string;
  label: string;
  action: string;
  expectedObservation: string;
  recommendedTab?: RecommendedTab;
};

export type LearningCheckpoint = {
  id: string;
  label: string;
  expected: string;
  whereToLook: string;
  note: string;
};

export type LearningLesson = {
  lessonId: string;
  exampleId: string;
  progressCompatibilityVersion: number;
  title: string;
  level: LearningLevel;
  concepts: string[];
  learningGoals: string[];
  observe: string[];
  suggestedSteps: LearningStep[];
  checkpoints: LearningCheckpoint[];
  commonQuestions?: string[];
};

export const learningLessons: LearningLesson[] = [
  {
    lessonId: "casl-gr2-addition",
    exampleId: "casl-gr2-addition",
    progressCompatibilityVersion: 1,
    title: "Direct CASL execution with GR2",
    level: "CASL basics",
    concepts: ["LD", "ADDA", "ST", "RET", "GR register", "memory write"],
    learningGoals: [
      "Understand how CASL instructions read from memory, update a GR register, and write back to memory.",
      "Connect PR movement with instruction and operand words."
    ],
    observe: ["GR2 after each Step", "Memory[C] after ST", "Machine Code rows for LD / ADDA / ST"],
    suggestedSteps: [
      {
        stepId: "assemble",
        label: "Assemble",
        action: "Click Assemble.",
        expectedObservation: "The program loads at 0020 and Machine Code shows LD, ADDA, ST, and RET.",
        recommendedTab: "Machine Code"
      },
      {
        stepId: "step-ld",
        label: "Step LD",
        action: "Click Step once.",
        expectedObservation: "GR2 becomes 0003 after loading A.",
        recommendedTab: "Trace"
      },
      {
        stepId: "step-adda",
        label: "Step ADDA",
        action: "Click Step again.",
        expectedObservation: "GR2 becomes 0007 after adding B.",
        recommendedTab: "Trace"
      },
      {
        stepId: "step-st",
        label: "Step ST",
        action: "Click Step again and open Memory.",
        expectedObservation: "Memory[C] becomes 0007.",
        recommendedTab: "Memory"
      }
    ],
    checkpoints: [
      {
        id: "gr2-after-ld",
        label: "After first Step",
        expected: "GR2 should be 0003.",
        whereToLook: "Registers tab",
        note: "LD GR2,A copies Memory[A] into GR2."
      },
      {
        id: "gr2-after-adda",
        label: "After ADDA",
        expected: "GR2 should be 0007.",
        whereToLook: "Registers tab",
        note: "ADDA GR2,B adds Memory[B] to GR2."
      },
      {
        id: "memory-c-after-st",
        label: "After ST",
        expected: "Memory[C] should be 0007.",
        whereToLook: "Memory tab",
        note: "ST GR2,C writes the register value back to memory."
      }
    ],
    commonQuestions: [
      "Why does PR advance by two for LD / ADDA / ST?",
      "Which machine-code row is the operand address?"
    ]
  },
  {
    lessonId: "casl-logic-operations",
    exampleId: "casl-logic-operations",
    progressCompatibilityVersion: 1,
    title: "Bitwise logic on the ALU path",
    level: "CASL basics",
    concepts: ["AND", "OR", "XOR", "bitwise logic", "ALU path", "memory write"],
    learningGoals: [
      "Understand how bitwise CASL instructions read an operand from memory and write the result back to a GR register.",
      "Compare logical ALU operations with arithmetic ALU operations in Machine Code and Trace."
    ],
    observe: ["Machine Code opcodes for AND / OR / XOR", "GR1 after each logic Step", "Memory[RESULT] after ST"],
    suggestedSteps: [
      {
        stepId: "assemble",
        label: "Assemble logic program",
        action: "Click Assemble.",
        expectedObservation: "Machine Code shows AND, OR, XOR, ST, and RET rows.",
        recommendedTab: "Machine Code"
      },
      {
        stepId: "step-logic",
        label: "Step through logic operations",
        action: "Click Step through AND, OR, and XOR.",
        expectedObservation: "GR1 changes through the logical operations and Trace records each instruction.",
        recommendedTab: "Trace"
      },
      {
        stepId: "check-result",
        label: "Check RESULT",
        action: "Open Memory after ST.",
        expectedObservation: "RESULT contains 0002.",
        recommendedTab: "Memory"
      }
    ],
    checkpoints: [
      {
        id: "logic-opcodes",
        label: "Logic opcodes",
        expected: "Machine Code should contain AND, OR, and XOR instruction words.",
        whereToLook: "Machine Code tab",
        note: "These are register/address-format instructions, so each has an instruction word and operand word."
      },
      {
        id: "logic-result",
        label: "Final logic result",
        expected: "GR1 and Memory[RESULT] should be 0002.",
        whereToLook: "Registers and Memory tabs",
        note: "#00F0 AND #0F0F gives 0000; OR #0003 gives 0003; XOR #0001 gives 0002."
      }
    ],
    commonQuestions: [
      "Why do logic instructions still use the ALU path?",
      "Which flags change after AND / OR / XOR?"
    ]
  },
  {
    lessonId: "casl-logical-add-compare",
    exampleId: "casl-logical-add-compare",
    progressCompatibilityVersion: 1,
    title: "Unsigned add, compare, and overflow jump",
    level: "CASL basics",
    concepts: ["ADDL", "CPL", "JOV", "unsigned comparison", "overflow jump"],
    learningGoals: [
      "See the difference between signed arithmetic compare and unsigned logical compare.",
      "Understand that JOV follows the overflow flag and falls through when OF is not set."
    ],
    observe: ["ADDL and CPL machine words", "FR after CPL", "JOV control-flow target and fallthrough"],
    suggestedSteps: [
      {
        stepId: "assemble",
        label: "Assemble arithmetic program",
        action: "Click Assemble.",
        expectedObservation: "Generated rows include ADDL, CPL, JOV, and the OVER label.",
        recommendedTab: "Machine Code"
      },
      {
        stepId: "step-cpl",
        label: "Step to CPL",
        action: "Step through LD, ADDL, and CPL.",
        expectedObservation: "GR1 becomes 0003 and CPL sets the zero flag for the unsigned compare.",
        recommendedTab: "Trace"
      },
      {
        stepId: "step-jov",
        label: "Observe JOV",
        action: "Step JOV.",
        expectedObservation: "JOV falls through because OF is not set.",
        recommendedTab: "Trace"
      },
      {
        stepId: "check-result",
        label: "Check RESULT",
        action: "Run or Step through ST and open Memory.",
        expectedObservation: "RESULT is 0003.",
        recommendedTab: "Memory"
      }
    ],
    checkpoints: [
      {
        id: "addl-result",
        label: "ADDL result",
        expected: "ADDL should update GR1 to 0003.",
        whereToLook: "Registers tab",
        note: "ADDL uses unsigned 16-bit addition."
      },
      {
        id: "cpl-flags",
        label: "CPL flags",
        expected: "CPL should set ZF when GR1 equals C.",
        whereToLook: "Registers tab / FR row",
        note: "CPL compares as unsigned values and does not modify GR1."
      },
      {
        id: "jov-fallthrough",
        label: "JOV fallthrough",
        expected: "JOV should not jump to OVER when OF is not set.",
        whereToLook: "Trace or Control Flow text",
        note: "The next executed instruction is ST GR1,RESULT."
      },
      {
        id: "result",
        label: "Final result",
        expected: "Memory[RESULT] should be 0003.",
        whereToLook: "Memory tab",
        note: "The OVER path is only used when OF is set."
      }
    ],
    commonQuestions: [
      "What makes ADDL different from ADDA?",
      "When would JOV jump to OVER?"
    ]
  },
  {
    lessonId: "casl-shift-operations",
    exampleId: "casl-shift-operations",
    progressCompatibilityVersion: 1,
    title: "Shift instructions and shifter path",
    level: "CASL basics",
    concepts: ["SLL", "SRL", "SLA", "SRA", "shift count operand", "shifted-out bit / OF", "FR update"],
    learningGoals: [
      "Understand that shift instructions use the operand word as a shift count / effective address value.",
      "See that shifts update GR and FR without reading Memory[operand] as data."
    ],
    observe: ["SLL / SRL / SLA / SRA machine opcodes", "GR1 after each shift Step", "FR after shifted-out bits"],
    suggestedSteps: [
      {
        stepId: "assemble",
        label: "Assemble shift program",
        action: "Click Assemble.",
        expectedObservation: "Machine Code shows SLA, SRA, SLL, and SRL instruction words with operand words.",
        recommendedTab: "Machine Code"
      },
      {
        stepId: "step-shifts",
        label: "Step through shifts",
        action: "Step through SLL, SRL, SLA, and SRA.",
        expectedObservation: "GR1 changes through the shifter path and Trace records each shift.",
        recommendedTab: "Trace"
      },
      {
        stepId: "circuit-focus",
        label: "Observe shifter path",
        action: "Open Circuit Focus Mode while stepping a shift instruction.",
        expectedObservation: "GR1 and the shift count flow into the ALU/Shifter path; Memory is not used as shift data.",
        recommendedTab: "Trace"
      },
      {
        stepId: "check-result",
        label: "Check RESULT",
        action: "Open Memory after ST.",
        expectedObservation: "RESULT contains 0003.",
        recommendedTab: "Memory"
      }
    ],
    checkpoints: [
      {
        id: "shift-opcodes",
        label: "Shift opcodes",
        expected: "Machine Code should contain opcodes 50 / 51 / 52 / 53 for SLA / SRA / SLL / SRL.",
        whereToLook: "Machine Code tab",
        note: "Each shift is a register/address-format instruction with a separate operand word."
      },
      {
        id: "shift-no-memory-read",
        label: "Shift count is not memory data",
        expected: "Shift steps should not mark a Memory row as a data read for the count.",
        whereToLook: "Circuit Focus Mode / Trace",
        note: "The operand word is used as the count / effective address value; it is not a memory data read."
      },
      {
        id: "shift-final-result",
        label: "Final result",
        expected: "GR1 and Memory[RESULT] should be 0003.",
        whereToLook: "Registers and Memory tabs",
        note: "The sample shifts 3 left and right and returns to the original value."
      }
    ],
    commonQuestions: [
      "Why does a shift instruction have an operand word?",
      "Why is Memory[0001] not read for SLL GR1,1?"
    ]
  },
  {
    lessonId: "casl-index-addressing",
    exampleId: "casl-index-addressing",
    progressCompatibilityVersion: 1,
    title: "Index addressing with effective address",
    level: "Machine code",
    concepts: ["base address", "index register", "effective address unit", "address computation", "Memory[base + index]", "x field in machine code"],
    learningGoals: [
      "Understand how adr,x encodes an index register in the machine word.",
      "Observe that runtime memory access uses the effective address, while the operand word still stores the base address."
    ],
    observe: ["Machine Code x field for LD GR1,A,GR2", "Effective Address Unit in Circuit Focus Mode", "Memory[B] read and Memory[RESULT] write"],
    suggestedSteps: [
      {
        stepId: "assemble",
        label: "Assemble index program",
        action: "Click Assemble.",
        expectedObservation: "Machine Code shows LD GR1,A,GR2 with x = GR2.",
        recommendedTab: "Machine Code"
      },
      {
        stepId: "step-lad",
        label: "Prepare index register",
        action: "Step LAD GR2,1.",
        expectedObservation: "GR2 becomes 0001.",
        recommendedTab: "Trace"
      },
      {
        stepId: "step-ld-indexed",
        label: "Step indexed LD",
        action: "Step LD GR1,A,GR2 in Circuit Focus Mode.",
        expectedObservation: "The Effective Address Unit shows base A plus GR2, and the Memory[B] row is read.",
        recommendedTab: "Trace"
      },
      {
        stepId: "check-result",
        label: "Check RESULT",
        action: "Run or Step through ST and open Memory.",
        expectedObservation: "RESULT contains 0014.",
        recommendedTab: "Memory"
      }
    ],
    checkpoints: [
      {
        id: "x-field",
        label: "Machine word x field",
        expected: "The LD instruction word should show x = GR2.",
        whereToLook: "Machine Code explanation",
        note: "GR0 is not a valid index register; GR1-GR7 can appear in the x field."
      },
      {
        id: "effective-address",
        label: "Effective address",
        expected: "The EAU should show A + GR2 = B.",
        whereToLook: "Circuit Focus Mode / Machine Code explanation",
        note: "The operand word stores A, and runtime adds GR2 in the Effective Address Unit to reach B."
      },
      {
        id: "final-result",
        label: "Final result",
        expected: "GR1 and Memory[RESULT] should be 0014.",
        whereToLook: "Registers and Memory tabs",
        note: "0014 is decimal 20, the value stored at B."
      }
    ],
    commonQuestions: [
      "Why does the operand word still point to A?",
      "Why does the Memory row highlight B instead of A?"
    ]
  },
  {
    lessonId: "casl-push-pop-stack",
    exampleId: "casl-push-pop-stack",
    progressCompatibilityVersion: 1,
    title: "PUSH / POP stack basics",
    level: "Machine code",
    concepts: ["SP", "stack memory", "PUSH stores effective address", "POP reads Memory[SP]", "SP decrement", "SP increment", "stack preview"],
    learningGoals: [
      "Understand the teaching VM stack convention used by PUSH and POP.",
      "Observe that PUSH stores the effective address value itself, not the memory data at that address."
    ],
    observe: ["SP before and after PUSH / POP", "Stack Preview row written by PUSH", "GR1 after POP", "RESULT after ST"],
    suggestedSteps: [
      {
        stepId: "assemble",
        label: "Assemble stack program",
        action: "Click Assemble.",
        expectedObservation: "Machine Code shows PUSH with an operand word and POP as a one-word register instruction.",
        recommendedTab: "Machine Code"
      },
      {
        stepId: "step-push",
        label: "Step PUSH",
        action: "Step to PUSH A,GR2 in Circuit Focus Mode.",
        expectedObservation: "SP decrements, the stack row is written, and the stored value is the effective address of B.",
        recommendedTab: "Trace"
      },
      {
        stepId: "step-pop",
        label: "Step POP",
        action: "Step POP GR1.",
        expectedObservation: "GR1 receives the value from Memory[SP], then SP increments.",
        recommendedTab: "Trace"
      },
      {
        stepId: "check-result",
        label: "Check RESULT",
        action: "Run or Step through ST and open Memory.",
        expectedObservation: "RESULT contains 0029, the address of B in this demo.",
        recommendedTab: "Memory"
      }
    ],
    checkpoints: [
      {
        id: "push-sp-decrement",
        label: "PUSH SP update",
        expected: "PUSH should decrement SP before writing stack memory.",
        whereToLook: "Stack Preview / Trace",
        note: "The active stack write row is the new SP address."
      },
      {
        id: "push-stores-ea",
        label: "PUSH stored value",
        expected: "Memory[new SP] should store 0029, the effective address of B.",
        whereToLook: "Stack Preview / Signal Probe",
        note: "PUSH A,GR2 stores A+GR2, not Memory[A+GR2]."
      },
      {
        id: "pop-loads-gr",
        label: "POP register update",
        expected: "POP should load GR1 with 0029 and then increment SP.",
        whereToLook: "Registers / Trace",
        note: "POP reads the old SP row before SP moves upward."
      },
      {
        id: "final-result",
        label: "Final result",
        expected: "Memory[RESULT] should be 0029.",
        whereToLook: "Memory tab",
        note: "The result is an address value, not decimal 20."
      }
    ],
    commonQuestions: [
      "Why is RESULT 0029 instead of 0014?",
      "Why does PUSH write to Memory[SP] before POP reads from Memory[SP]?"
    ]
  },
  {
    lessonId: "casl-call-return",
    exampleId: "casl-call-return",
    progressCompatibilityVersion: 1,
    title: "CALL and stack-aware RET",
    level: "Machine code",
    concepts: ["CALL target", "return address", "stack write", "stack-aware RET", "top-level RET finish", "callDepth"],
    learningGoals: [
      "Understand how CALL saves the return address on the stack before jumping to a subroutine.",
      "Distinguish a RET inside a call frame from the final top-level RET that finishes the program."
    ],
    observe: ["CALL stack write row", "SUB execution", "RET stack return target", "Final top-level RET finish", "RESULT after ST"],
    suggestedSteps: [
      {
        stepId: "assemble",
        label: "Assemble call program",
        action: "Click Assemble.",
        expectedObservation: "Machine Code shows CALL with opcode 80 and a target operand word.",
        recommendedTab: "Machine Code"
      },
      {
        stepId: "step-call",
        label: "Step CALL",
        action: "Step to CALL SUB in Circuit Focus Mode.",
        expectedObservation: "The return address is written to Memory[SP], SP decrements, and PR jumps to SUB.",
        recommendedTab: "Trace"
      },
      {
        stepId: "step-sub-ret",
        label: "Step subroutine RET",
        action: "Step ADDA in SUB, then Step RET.",
        expectedObservation: "RET reads the return address from Memory[SP], increments SP, and returns PR to ST.",
        recommendedTab: "Trace"
      },
      {
        stepId: "finish",
        label: "Finish program",
        action: "Run or Step through ST and final RET.",
        expectedObservation: "RESULT becomes 0006 and the final RET finishes because callDepth is back to zero.",
        recommendedTab: "Memory"
      }
    ],
    checkpoints: [
      {
        id: "call-stack-write",
        label: "CALL stack write",
        expected: "CALL should write return address 0024 to the new SP row.",
        whereToLook: "Stack Preview / Signal Probe / Trace",
        note: "The return address is the instruction after CALL."
      },
      {
        id: "ret-stack-return",
        label: "Stack RET",
        expected: "RET inside SUB should restore PR to 0024 and decrease callDepth.",
        whereToLook: "Trace / Current Instruction",
        note: "This RET returns to ST instead of finishing the program."
      },
      {
        id: "top-level-ret",
        label: "Top-level RET",
        expected: "The final RET should finish the program without stack activity.",
        whereToLook: "Run State / Trace",
        note: "Existing RET demos stay compatible because callDepth is zero."
      },
      {
        id: "final-result",
        label: "Final result",
        expected: "Memory[RESULT] should be 0006.",
        whereToLook: "Memory tab",
        note: "The subroutine increments GR1 from 0005 to 0006."
      }
    ],
    commonQuestions: [
      "Why does CALL push 0024 instead of the subroutine address?",
      "Why does one RET return while the final RET finishes?"
    ]
  },
  {
    lessonId: "casl-nested-call-return",
    exampleId: "casl-nested-call-return",
    progressCompatibilityVersion: 1,
    title: "Nested CALL return order",
    level: "Machine code",
    concepts: ["nested CALL", "return address stack", "last-in-first-out (LIFO) return", "callDepth", "top-level RET"],
    learningGoals: [
      "Observe callDepth rising above one when a subroutine calls another subroutine.",
      "Confirm that each RET returns to the most recent saved return address."
    ],
    observe: ["callDepth 0 -> 1 -> 2", "Return addresses on Stack Preview", "RET order from SUB2 to SUB1 to MAIN", "RESULT after final ST"],
    suggestedSteps: [
      {
        stepId: "assemble",
        label: "Assemble nested call",
        action: "Click Assemble for CASL: Nested Call Return.",
        expectedObservation: "Machine Code shows CALL SUB1 and CALL SUB2 rows.",
        recommendedTab: "Machine Code"
      },
      {
        stepId: "step-calls",
        label: "Step both CALLs",
        action: "Enter Circuit Focus Mode and Step until after CALL SUB2.",
        expectedObservation: "Call Stack depth reaches 2 and Stack Preview contains two return addresses.",
        recommendedTab: "Trace"
      },
      {
        stepId: "step-returns",
        label: "Step both stack RETs",
        action: "Step through RET in SUB2, then RET in SUB1.",
        expectedObservation: "Each RET reads Memory[SP] into PR and callDepth returns toward zero.",
        recommendedTab: "Trace"
      },
      {
        stepId: "check-result",
        label: "Check final result",
        action: "Run to completion.",
        expectedObservation: "RESULT becomes 0004 and the final RET finishes at callDepth zero.",
        recommendedTab: "Memory"
      }
    ],
    checkpoints: [
      {
        id: "depth-two",
        label: "Nested depth",
        expected: "Call Stack depth should reach 2 after CALL SUB2.",
        whereToLook: "Call Stack / Trace",
        note: "Nested calls are returned in last-in-first-out order."
      },
      {
        id: "ret-order",
        label: "Return order",
        expected: "RET in SUB2 returns to ADDA GR1,ONE; RET in SUB1 returns to ST GR1,RESULT.",
        whereToLook: "Trace / Program panel",
        note: "The return edge is dynamic and comes from Memory[SP]."
      },
      {
        id: "result",
        label: "Final result",
        expected: "Memory[RESULT] should be 0004.",
        whereToLook: "Memory Viewer / Trace",
        note: "GR1 starts at 1, SUB2 adds 2, and SUB1 adds 1."
      }
    ],
    commonQuestions: [
      "Why does callDepth reach 2?",
      "Why does SUB2 return before SUB1 continues?"
    ]
  },
  {
    lessonId: "cpp-function-call",
    exampleId: "cpp-function-call",
    progressCompatibilityVersion: 1,
    title: "C++ function call lowered to CALL / RET",
    level: "C++ to CASL",
    concepts: ["function label", "CALL", "return address", "GR0 return value", "stack-aware RET", "top-level RET finish"],
    learningGoals: [
      "See how a no-argument C++ function becomes a CASL subroutine label.",
      "Understand that the function return value is placed in GR0.",
      "Connect C++ function return with CALL / stack-aware RET in the COMET stack view."
    ],
    observe: ["FUNC_ADDONE label in Generated CASL", "CALL FUNC_ADDONE", "GR0 after RET", "Call Stack depth during the call"],
    suggestedSteps: [
      {
        stepId: "open-generated",
        label: "Find generated function",
        action: "Click Assemble and open Generated CASL.",
        expectedObservation: "Generated CASL contains FUNC_ADDONE and CALL FUNC_ADDONE.",
        recommendedTab: "Generated CASL"
      },
      {
        stepId: "inspect-call",
        label: "Inspect CALL",
        action: "Open Machine Code and click the CALL instruction word.",
        expectedObservation: "The explanation shows the CALL target, return address, and stack write.",
        recommendedTab: "Machine Code"
      },
      {
        stepId: "run-trace",
        label: "Run and read Trace",
        action: "Open Trace and click Run.",
        expectedObservation: "Trace shows CALL, RET stack return, and final top-level RET finish.",
        recommendedTab: "Trace"
      }
    ],
    checkpoints: [
      {
        id: "function-label",
        label: "Function label",
        expected: "Generated CASL should contain FUNC_ADDONE.",
        whereToLook: "Generated CASL",
        note: "Non-main C++ functions use generated FUNC_* CASL labels."
      },
      {
        id: "call-stack",
        label: "CALL / RET flow",
        expected: "CALL should write a return address to the stack, and RET inside addOne should return to the caller.",
        whereToLook: "Trace / Call Stack",
        note: "The final RET in main still uses top-level finish semantics."
      },
      {
        id: "gr0-result",
        label: "Return value",
        expected: "GR0 should be 0001 when the program finishes.",
        whereToLook: "Registers tab / Trace",
        note: "The MVP convention uses GR0 as the return-value register."
      }
    ],
    commonQuestions: [
      "Why is GR0 used as the function return value?",
      "Why does main's final RET finish while addOne's RET returns to the caller?"
    ]
  },
  {
    lessonId: "cpp-function-argument",
    exampleId: "cpp-function-argument",
    progressCompatibilityVersion: 1,
    title: "C++ single-argument function lowered through GR1",
    level: "C++ to CASL",
    concepts: ["GR1 argument register", "GR0 return value", "CALL", "stack-aware RET", "static parameter label", "no stack-frame locals yet"],
    learningGoals: [
      "See how the first C++ argument is loaded into GR1 before CALL.",
      "Confirm that the callee saves GR1 into a generated static parameter label.",
      "Connect the GR1 argument convention with the existing GR0 return convention."
    ],
    observe: ["LAD GR1,5 before CALL", "ST GR1,FUNC_ADDONE_X at function entry", "CALL FUNC_ADDONE", "GR0 = 0006 after return"],
    suggestedSteps: [
      {
        stepId: "open-generated",
        label: "Find argument lowering",
        action: "Click Assemble and open Generated CASL.",
        expectedObservation: "The call site contains LAD GR1,5 followed by CALL FUNC_ADDONE.",
        recommendedTab: "Generated CASL"
      },
      {
        stepId: "inspect-function-entry",
        label: "Inspect function entry",
        action: "Find FUNC_ADDONE in Generated CASL.",
        expectedObservation: "The first instruction stores GR1 into FUNC_ADDONE_X.",
        recommendedTab: "Generated CASL"
      },
      {
        stepId: "run-trace",
        label: "Run and read Trace",
        action: "Open Trace and click Run.",
        expectedObservation: "Trace shows GR1 loaded with 0005, CALL / RET flow, and final GR0 = 0006.",
        recommendedTab: "Trace"
      }
    ],
    checkpoints: [
      {
        id: "gr1-argument",
        label: "GR1 argument",
        expected: "Generated CASL should contain LAD GR1,5 before CALL FUNC_ADDONE.",
        whereToLook: "Generated CASL",
        note: "Phase 10C uses GR1 as the first argument register."
      },
      {
        id: "parameter-save",
        label: "Parameter save",
        expected: "Function body should contain ST GR1,FUNC_ADDONE_X.",
        whereToLook: "Generated CASL",
        note: "This is a static parameter label, not a stack-frame local."
      },
      {
        id: "gr0-result",
        label: "Return value",
        expected: "GR0 should be 0006 when the program finishes.",
        whereToLook: "Registers tab / Trace",
        note: "GR0 remains the return-value register."
      }
    ],
    commonQuestions: [
      "Why does the argument use GR1 but the return value use GR0?",
      "Why is FUNC_ADDONE_X not a real stack-frame local yet?"
    ]
  },
  {
    lessonId: "cpp-function-arguments",
    exampleId: "cpp-function-arguments",
    progressCompatibilityVersion: 1,
    title: "C++ multi-register arguments lowered through GR1 / GR2",
    level: "C++ to CASL",
    concepts: ["GR1 / GR2 argument registers", "GR0 return value", "parameter save at function entry", "CALL / RET", "static namespaced parameter labels", "no stack arguments yet"],
    learningGoals: [
      "See how the first two C++ arguments are loaded into GR1 and GR2 before CALL.",
      "Confirm that the callee saves GR1 and GR2 into generated static parameter labels.",
      "Understand that Phase 10D uses register arguments only; stack arguments are still future work."
    ],
    observe: ["LAD GR1,2 and LAD GR2,3 before CALL", "ST GR1,FUNC_ADD_A and ST GR2,FUNC_ADD_B at function entry", "CALL FUNC_ADD", "GR0 = 0005 after return"],
    suggestedSteps: [
      {
        stepId: "open-generated",
        label: "Find argument register loads",
        action: "Click Assemble and open Generated CASL.",
        expectedObservation: "The call site contains LAD GR1,2 and LAD GR2,3 before CALL FUNC_ADD.",
        recommendedTab: "Generated CASL"
      },
      {
        stepId: "inspect-function-entry",
        label: "Inspect parameter saves",
        action: "Find FUNC_ADD in Generated CASL.",
        expectedObservation: "The first instructions store GR1 into FUNC_ADD_A and GR2 into FUNC_ADD_B.",
        recommendedTab: "Generated CASL"
      },
      {
        stepId: "run-trace",
        label: "Run and read Trace",
        action: "Open Trace and click Run.",
        expectedObservation: "Trace shows GR1 / GR2 loaded before CALL, CALL / RET flow, and final GR0 = 0005.",
        recommendedTab: "Trace"
      }
    ],
    checkpoints: [
      {
        id: "gr1-gr2-arguments",
        label: "GR1 / GR2 arguments",
        expected: "Generated CASL should contain LAD GR1,2 and LAD GR2,3 before CALL FUNC_ADD.",
        whereToLook: "Generated CASL",
        note: "Phase 10D uses GR1, GR2, and GR3 as the first three argument registers."
      },
      {
        id: "parameter-saves",
        label: "Parameter saves",
        expected: "Function body should contain ST GR1,FUNC_ADD_A and ST GR2,FUNC_ADD_B.",
        whereToLook: "Generated CASL",
        note: "These are static parameter labels, not stack-frame locals."
      },
      {
        id: "gr0-result",
        label: "Return value",
        expected: "GR0 should be 0005 when the program finishes.",
        whereToLook: "Registers tab / Trace",
        note: "GR0 remains the return-value register."
      }
    ],
    commonQuestions: [
      "Why are the arguments in GR1 and GR2 instead of the stack?",
      "What happens when a function needs more than three arguments?"
    ]
  },
  {
    lessonId: "cpp-addition",
    exampleId: "cpp-addition",
    progressCompatibilityVersion: 1,
    title: "C++ addition lowered to CASL",
    level: "C++ to CASL",
    concepts: ["assignment lowering", "LD / ADDA / ST", "Generated CASL", "Machine Code word"],
    learningGoals: [
      "See how C++ assignment and addition become CASL load/add/store instructions.",
      "Understand that instruction words and operand words are separate rows."
    ],
    observe: ["Generated CASL rows for c = a + b", "Machine Code instruction and operand words", "GR0 after return"],
    suggestedSteps: [
      {
        stepId: "assemble",
        label: "Generate CASL",
        action: "Click Assemble and open Generated CASL.",
        expectedObservation: "Generated CASL contains LD, ADDA, ST, LD GR0,C, and RET.",
        recommendedTab: "Generated CASL"
      },
      {
        stepId: "machine-code",
        label: "Inspect machine words",
        action: "Open Machine Code and click the LD instruction word.",
        expectedObservation: "The explanation shows opcode/register fields and the operand address.",
        recommendedTab: "Machine Code"
      },
      {
        stepId: "run",
        label: "Run",
        action: "Click Run.",
        expectedObservation: "The program finishes with GR0 = 001E.",
        recommendedTab: "Trace"
      }
    ],
    checkpoints: [
      {
        id: "generated-casl-addition",
        label: "Generated CASL",
        expected: "Generated CASL should contain LD / ADDA / ST.",
        whereToLook: "Generated CASL tab",
        note: "c = a + b uses GR1 as the temporary calculation register."
      },
      {
        id: "machine-code-rows",
        label: "Machine Code",
        expected: "Machine Code should contain instruction words and operand words.",
        whereToLook: "Machine Code tab",
        note: "For LD GR1,A, the first word encodes opcode/register and the second word stores the address of A."
      },
      {
        id: "return-value",
        label: "Return value",
        expected: "GR0 should be 001E after Run.",
        whereToLook: "Registers tab",
        note: "return c loads C into GR0 before RET."
      }
    ],
    commonQuestions: ["Why does return use GR0?", "Where is the address of A stored?"]
  },
  {
    lessonId: "cpp-if-else",
    exampleId: "cpp-if-else",
    progressCompatibilityVersion: 1,
    title: "if / else as compare and jump",
    level: "Control flow",
    concepts: ["CPA", "conditional jump", "IF label", "control-flow target"],
    learningGoals: [
      "Understand how equality checks use CPA and a conditional jump.",
      "Follow the target label and target address for a branch."
    ],
    observe: ["CPA and JZE in Generated CASL", "IF_TRUE / IF_END labels", "Control Flow target text"],
    suggestedSteps: [
      {
        stepId: "generated-casl",
        label: "Find the branch",
        action: "Assemble and open Generated CASL.",
        expectedObservation: "CPA compares values and JZE targets the true branch label.",
        recommendedTab: "Generated CASL"
      },
      {
        stepId: "jump-word",
        label: "Inspect jump word",
        action: "Open Machine Code and click the JZE row.",
        expectedObservation: "The explanation shows the target label and address.",
        recommendedTab: "Machine Code"
      },
      {
        stepId: "run",
        label: "Run",
        action: "Click Run.",
        expectedObservation: "The equality branch is taken and GR0 becomes 0001.",
        recommendedTab: "Trace"
      }
    ],
    checkpoints: [
      {
        id: "contains-cpa-jze",
        label: "Compare and jump",
        expected: "Generated CASL should contain CPA and JZE or an equivalent conditional jump.",
        whereToLook: "Generated CASL tab",
        note: "CPA sets flags; JZE uses the zero flag."
      },
      {
        id: "target-info",
        label: "Target label",
        expected: "Control-flow target should point to IF_TRUE / IF_END labels.",
        whereToLook: "Generated CASL or Machine Code",
        note: "The target explains where PR can move next."
      },
      {
        id: "final-gr0",
        label: "Return value",
        expected: "GR0 should be 0001.",
        whereToLook: "Registers tab",
        note: "The true branch writes c = 1."
      }
    ],
    commonQuestions: ["What flag does JZE read?", "What happens if A and B are not equal?"]
  },
  {
    lessonId: "cpp-while-sum",
    exampleId: "cpp-while-sum",
    progressCompatibilityVersion: 1,
    title: "while loop and repeated execution",
    level: "Loops",
    concepts: ["loop condition", "loop back jump", "Trace", "Memory update"],
    learningGoals: [
      "Understand the condition/body/end structure of a while loop.",
      "Use Trace to see repeated execution and Memory Viewer to see data changes."
    ],
    observe: ["LOOP_BEGIN / LOOP_END labels", "Trace repeated steps", "SUM memory value"],
    suggestedSteps: [
      {
        stepId: "labels",
        label: "Find loop labels",
        action: "Assemble and open Generated CASL.",
        expectedObservation: "LOOP_BEGIN and LOOP_END show the loop boundary.",
        recommendedTab: "Generated CASL"
      },
      {
        stepId: "trace",
        label: "Run with Trace",
        action: "Open Trace and click Run.",
        expectedObservation: "Trace shows repeated loop execution.",
        recommendedTab: "Trace"
      },
      {
        stepId: "memory",
        label: "Check data",
        action: "Open Memory after Run.",
        expectedObservation: "SUM becomes 0006.",
        recommendedTab: "Memory"
      }
    ],
    checkpoints: [
      {
        id: "loop-labels",
        label: "Loop labels",
        expected: "Generated CASL should contain LOOP_BEGIN / LOOP_END.",
        whereToLook: "Generated CASL tab",
        note: "The begin label is where the condition is checked again."
      },
      {
        id: "trace-loop",
        label: "Repeated execution",
        expected: "Trace should show repeated loop execution.",
        whereToLook: "Trace tab",
        note: "Trace is the best view for seeing loop repetition."
      },
      {
        id: "final-sum",
        label: "Final result",
        expected: "GR0 should be 0006.",
        whereToLook: "Registers tab",
        note: "The sum 3 + 2 + 1 is returned."
      }
    ],
    commonQuestions: ["Which JUMP returns to the condition?", "Why does Run need maxSteps?"]
  },
  {
    lessonId: "cpp-for-sum",
    exampleId: "cpp-for-sum",
    progressCompatibilityVersion: 1,
    title: "for loop structure",
    level: "Loops",
    concepts: ["for initializer", "condition", "increment", "loop lowering"],
    learningGoals: [
      "Separate a for loop into initializer, condition, body, increment, and end labels.",
      "Compare FOR_BEGIN / FOR_BODY / FOR_END with while-loop labels."
    ],
    observe: ["FOR_BEGIN / FOR_BODY / FOR_END", "increment code", "loop-back jump"],
    suggestedSteps: [
      {
        stepId: "find-for-labels",
        label: "Find for blocks",
        action: "Assemble and open Generated CASL.",
        expectedObservation: "The generated code contains FOR_BEGIN, FOR_BODY, and FOR_END.",
        recommendedTab: "Generated CASL"
      },
      {
        stepId: "inspect-machine",
        label: "Inspect jump words",
        action: "Open Machine Code and click a JUMP row.",
        expectedObservation: "The explanation shows a loop target.",
        recommendedTab: "Machine Code"
      },
      {
        stepId: "run",
        label: "Run",
        action: "Click Run.",
        expectedObservation: "GR0 becomes 0006.",
        recommendedTab: "Trace"
      }
    ],
    checkpoints: [
      {
        id: "for-labels",
        label: "For labels",
        expected: "Generated CASL should contain FOR_BEGIN / FOR_BODY / FOR_END.",
        whereToLook: "Generated CASL tab",
        note: "The labels separate condition, body, and exit."
      },
      {
        id: "final-gr0",
        label: "Final result",
        expected: "GR0 should be 0006.",
        whereToLook: "Registers tab",
        note: "The loop sums 1 + 2 + 3."
      }
    ],
    commonQuestions: ["Where is the initializer generated?", "Which row increments i?"]
  },
  {
    lessonId: "cpp-for-sum-sugar",
    exampleId: "cpp-for-sum-sugar",
    progressCompatibilityVersion: 1,
    title: "for loop syntax sugar",
    level: "Loops",
    concepts: ["i++", "+=", "syntax sugar lowering", "natural C++ style"],
    learningGoals: [
      "See that i++ is lowered to add one and store back.",
      "See that sum += i is lowered to LD / ADDA / ST."
    ],
    observe: ["ADDA GR1,CONST_1 for i++", "LD / ADDA / ST for sum += i", "GR0 after Run"],
    suggestedSteps: [
      {
        stepId: "open-generated",
        label: "Open Generated CASL",
        action: "Assemble and inspect the generated loop.",
        expectedObservation: "i++ becomes ADDA with CONST_1.",
        recommendedTab: "Generated CASL"
      },
      {
        stepId: "inspect-machine",
        label: "Open Machine Code",
        action: "Click an ADDA row.",
        expectedObservation: "The explanation still shows ordinary COMET II instruction encoding.",
        recommendedTab: "Machine Code"
      },
      {
        stepId: "run",
        label: "Run",
        action: "Click Run.",
        expectedObservation: "GR0 becomes 0006.",
        recommendedTab: "Trace"
      }
    ],
    checkpoints: [
      {
        id: "increment-lowering",
        label: "i++ lowering",
        expected: "i++ should become ADDA with CONST_1.",
        whereToLook: "Generated CASL tab",
        note: "The syntax sugar is normalized before CASL generation."
      },
      {
        id: "compound-lowering",
        label: "sum += i lowering",
        expected: "sum += i should become LD / ADDA / ST.",
        whereToLook: "Generated CASL tab",
        note: "Compound assignment uses the same load-add-store pattern."
      },
      {
        id: "final-gr0",
        label: "Final result",
        expected: "GR0 should be 0006.",
        whereToLook: "Registers tab",
        note: "Natural syntax produces the same result as the explicit for loop."
      }
    ],
    commonQuestions: ["Where is CONST_1 stored?", "Why does syntax sugar not change machine-code meaning?"]
  },
  {
    lessonId: "cpp-break-continue",
    exampleId: "cpp-break-continue",
    progressCompatibilityVersion: 1,
    title: "break and continue as jumps",
    level: "Control flow",
    concepts: ["continue target", "break target", "FOR_CONTINUE", "FOR_END", "jump explanation", "Trace"],
    learningGoals: [
      "Understand why continue in a for loop jumps to the increment block.",
      "Understand why break jumps to the loop end.",
      "Trace the generated JUMP instructions at runtime."
    ],
    observe: ["JUMP FOR_CONTINUE_0", "JUMP FOR_END_0", "Trace entries for break and continue"],
    suggestedSteps: [
      {
        stepId: "open-generated",
        label: "Find control jumps",
        action: "Assemble and open Generated CASL.",
        expectedObservation: "continue targets FOR_CONTINUE and break targets FOR_END.",
        recommendedTab: "Generated CASL"
      },
      {
        stepId: "inspect-jumps",
        label: "Inspect Machine Code",
        action: "Open Machine Code and click JUMP FOR_CONTINUE_0 or JUMP FOR_END_0.",
        expectedObservation: "The explanation shows the control-flow target.",
        recommendedTab: "Machine Code"
      },
      {
        stepId: "run-trace",
        label: "Run with Trace",
        action: "Open Trace and click Run.",
        expectedObservation: "Trace includes continue and break jump target text.",
        recommendedTab: "Trace"
      }
    ],
    checkpoints: [
      {
        id: "continue-target",
        label: "Continue target",
        expected: "continue should jump to FOR_CONTINUE.",
        whereToLook: "Generated CASL or Trace",
        note: "For continue in a for loop, the increment must run before returning to the condition."
      },
      {
        id: "break-target",
        label: "Break target",
        expected: "break should jump to FOR_END.",
        whereToLook: "Generated CASL or Trace",
        note: "Break exits the current loop."
      },
      {
        id: "final-gr0",
        label: "Final result",
        expected: "GR0 should be 0004.",
        whereToLook: "Registers tab",
        note: "i = 2 is skipped and i = 4 exits the loop."
      }
    ],
    commonQuestions: [
      "Why does continue target FOR_CONTINUE instead of FOR_BEGIN?",
      "How does Machine Code show the jump target address?"
    ]
  },
  {
    lessonId: "cpp-double-storage",
    exampleId: "cpp-double-storage",
    progressCompatibilityVersion: 1,
    title: "Observe double as four 16-bit words",
    level: "C++ to CASL",
    concepts: ["double storage", "IEEE-754 binary64", "four-word copy", "high-word first", "LD / ST", "teaching ABI"],
    learningGoals: [
      "Read a double object as four consecutive 16-bit COMET II memory words.",
      "Follow double copy assignment as four ordinary LD / ST transfers.",
      "Distinguish representation teaching from unsupported floating-point arithmetic."
    ],
    observe: ["x and y storage labels", "word 1 through word 4 transfers", "Double Value Inspector raw bits", "x remaining unchanged"],
    suggestedSteps: [
      {
        stepId: "assemble-source",
        label: "Assemble source",
        action: "Click Assemble.",
        expectedObservation: "The C++ subset transpiles without using a native FPU.",
        recommendedTab: "Generated CASL"
      },
      {
        stepId: "inspect-generated-storage",
        label: "Inspect four-word storage",
        action: "Open Generated CASL and find X, X_W1, X_W2, and X_W3.",
        expectedObservation: "Each double object has four consecutive DS words.",
        recommendedTab: "Generated CASL"
      },
      {
        stepId: "open-memory",
        label: "Open Memory",
        action: "Open the Memory inspector.",
        expectedObservation: "The x and y words are grouped with binary64 bit ranges.",
        recommendedTab: "Memory"
      },
      {
        stepId: "select-x",
        label: "Decode x",
        action: "Select x in the Memory object selector.",
        expectedObservation: "Raw hex becomes 400C000000000000 after x initialization.",
        recommendedTab: "Memory"
      },
      {
        stepId: "step-to-copy",
        label: "Step to y = x",
        action: "Step until the double copy assignment begins.",
        expectedObservation: "Trace identifies one semantic y = x operation.",
        recommendedTab: "Trace"
      },
      {
        stepId: "observe-word-reads",
        label: "Observe word reads",
        action: "Step each LD from x.",
        expectedObservation: "Memory, MDR, and GR1 show one 16-bit word at a time.",
        recommendedTab: "Trace"
      },
      {
        stepId: "observe-word-writes",
        label: "Observe word writes",
        action: "Step each ST to y.",
        expectedObservation: "Only the current y word changes on each write.",
        recommendedTab: "Memory"
      },
      {
        stepId: "confirm-y-bits",
        label: "Confirm y raw bits",
        action: "Select y after the fourth write.",
        expectedObservation: "Raw hex is 400C000000000000.",
        recommendedTab: "Memory"
      },
      {
        stepId: "confirm-y-value",
        label: "Confirm decoded value",
        action: "Read the decoded value in Double Value Inspector.",
        expectedObservation: "y decodes to 3.5.",
        recommendedTab: "Memory"
      },
      {
        stepId: "confirm-copy-not-move",
        label: "Confirm copy semantics",
        action: "Select x again.",
        expectedObservation: "x remains 3.5; the assignment did not clear or move from x.",
        recommendedTab: "Memory"
      }
    ],
    checkpoints: [
      {
        id: "x-binary64",
        label: "x representation",
        expected: "x words are 400C 0000 0000 0000.",
        whereToLook: "Memory / Double Value Inspector",
        note: "The teaching ABI stores logical word 0 first."
      },
      {
        id: "y-copy-order",
        label: "y copy order",
        expected: "Trace shows word 1 / 4 through word 4 / 4 in stable order.",
        whereToLook: "Trace",
        note: "Each word uses a real LD followed by a real ST."
      },
      {
        id: "y-decoded-value",
        label: "y final value",
        expected: "y raw hex is 400C000000000000 and decoded value is 3.5.",
        whereToLook: "Double Value Inspector",
        note: "COMET II itself still performs only 16-bit transfers."
      },
      {
        id: "x-preserved",
        label: "x is preserved",
        expected: "x remains 3.5 after y = x.",
        whereToLook: "Double Value Inspector",
        note: "This is copy assignment, not move assignment."
      }
    ],
    commonQuestions: [
      "Why are four LD / ST pairs needed?",
      "Does COMET II have a double instruction or FPU?",
      "Why is the high word stored first?"
    ]
  }
];

const lessonByExampleId = new Map(learningLessons.map((lesson) => [lesson.exampleId, lesson]));

export function getLearningLesson(exampleId: string): LearningLesson | undefined {
  return lessonByExampleId.get(exampleId);
}

export function hasLearningLessonForEveryDemo(): boolean {
  return demoPrograms.every((program) => lessonByExampleId.has(program.id));
}
