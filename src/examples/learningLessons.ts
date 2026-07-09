import { demoPrograms } from "./demoPrograms";

export type LearningLevel = "CASL basics" | "C++ to CASL" | "Control flow" | "Loops" | "Machine code";
export type RecommendedTab = "Generated CASL" | "Machine Code" | "Trace" | "Memory" | "Output";

export type LearningStep = {
  id: string;
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
  exampleId: string;
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
    exampleId: "casl-gr2-addition",
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
        id: "assemble",
        label: "Assemble",
        action: "Click Assemble.",
        expectedObservation: "The program loads at 0020 and Machine Code shows LD, ADDA, ST, and RET.",
        recommendedTab: "Machine Code"
      },
      {
        id: "step-ld",
        label: "Step LD",
        action: "Click Step once.",
        expectedObservation: "GR2 becomes 0003 after loading A.",
        recommendedTab: "Trace"
      },
      {
        id: "step-adda",
        label: "Step ADDA",
        action: "Click Step again.",
        expectedObservation: "GR2 becomes 0007 after adding B.",
        recommendedTab: "Trace"
      },
      {
        id: "step-st",
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
    exampleId: "cpp-addition",
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
        id: "assemble",
        label: "Generate CASL",
        action: "Click Assemble and open Generated CASL.",
        expectedObservation: "Generated CASL contains LD, ADDA, ST, LD GR0,C, and RET.",
        recommendedTab: "Generated CASL"
      },
      {
        id: "machine-code",
        label: "Inspect machine words",
        action: "Open Machine Code and click the LD instruction word.",
        expectedObservation: "The explanation shows opcode/register fields and the operand address.",
        recommendedTab: "Machine Code"
      },
      {
        id: "run",
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
    exampleId: "cpp-if-else",
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
        id: "generated-casl",
        label: "Find the branch",
        action: "Assemble and open Generated CASL.",
        expectedObservation: "CPA compares values and JZE targets the true branch label.",
        recommendedTab: "Generated CASL"
      },
      {
        id: "jump-word",
        label: "Inspect jump word",
        action: "Open Machine Code and click the JZE row.",
        expectedObservation: "The explanation shows the target label and address.",
        recommendedTab: "Machine Code"
      },
      {
        id: "run",
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
    exampleId: "cpp-while-sum",
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
        id: "labels",
        label: "Find loop labels",
        action: "Assemble and open Generated CASL.",
        expectedObservation: "LOOP_BEGIN and LOOP_END show the loop boundary.",
        recommendedTab: "Generated CASL"
      },
      {
        id: "trace",
        label: "Run with Trace",
        action: "Open Trace and click Run.",
        expectedObservation: "Trace shows repeated loop execution.",
        recommendedTab: "Trace"
      },
      {
        id: "memory",
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
    exampleId: "cpp-for-sum",
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
        id: "find-for-labels",
        label: "Find for blocks",
        action: "Assemble and open Generated CASL.",
        expectedObservation: "The generated code contains FOR_BEGIN, FOR_BODY, and FOR_END.",
        recommendedTab: "Generated CASL"
      },
      {
        id: "inspect-machine",
        label: "Inspect jump words",
        action: "Open Machine Code and click a JUMP row.",
        expectedObservation: "The explanation shows a loop target.",
        recommendedTab: "Machine Code"
      },
      {
        id: "run",
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
    exampleId: "cpp-for-sum-sugar",
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
        id: "open-generated",
        label: "Open Generated CASL",
        action: "Assemble and inspect the generated loop.",
        expectedObservation: "i++ becomes ADDA with CONST_1.",
        recommendedTab: "Generated CASL"
      },
      {
        id: "inspect-machine",
        label: "Open Machine Code",
        action: "Click an ADDA row.",
        expectedObservation: "The explanation still shows ordinary COMET II instruction encoding.",
        recommendedTab: "Machine Code"
      },
      {
        id: "run",
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
    exampleId: "cpp-break-continue",
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
        id: "open-generated",
        label: "Find control jumps",
        action: "Assemble and open Generated CASL.",
        expectedObservation: "continue targets FOR_CONTINUE and break targets FOR_END.",
        recommendedTab: "Generated CASL"
      },
      {
        id: "inspect-jumps",
        label: "Inspect Machine Code",
        action: "Open Machine Code and click JUMP FOR_CONTINUE_0 or JUMP FOR_END_0.",
        expectedObservation: "The explanation shows the control-flow target.",
        recommendedTab: "Machine Code"
      },
      {
        id: "run-trace",
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
  }
];

const lessonByExampleId = new Map(learningLessons.map((lesson) => [lesson.exampleId, lesson]));

export function getLearningLesson(exampleId: string): LearningLesson | undefined {
  return lessonByExampleId.get(exampleId);
}

export function hasLearningLessonForEveryDemo(): boolean {
  return demoPrograms.every((program) => lessonByExampleId.has(program.id));
}
