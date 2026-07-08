export type DemoSourceMode = "casl" | "cpp";
export type DemoProgram = {
  id: string;
  name: string;
  mode: DemoSourceMode;
  source: string;
  description: string;
  whatThisShows: string;
  expectedResult: string;
  suggestedActions: string[];
};

export const demoPrograms: DemoProgram[] = [
  {
    id: "casl-gr2-addition",
    name: "CASL: GR2 Addition",
    mode: "casl",
    source: `MAIN START
     LD    GR2,A
     ADDA  GR2,B
     ST    GR2,C
     RET
A    DC    3
B    DC    4
C    DS    1
     END`,
    description: "Direct CASL execution showing GR2 and Memory[C] changes.",
    whatThisShows: "CASL II source is assembled directly and executed on the COMET-II state model.",
    expectedResult: "GR2 = 0007 and Memory[C] = 0007 after ST; RET finishes the program.",
    suggestedActions: ["Click Assemble.", "Step through LD, ADDA, and ST.", "Open Memory and confirm label C is written."]
  },
  {
    id: "cpp-addition",
    name: "C++: Addition",
    mode: "cpp",
    source: `int main() {
    int a = 10;
    int b = 20;
    int c;
    c = a + b;
    return c;
}`,
    description: "C++ subset is lowered to CASL and then executed.",
    whatThisShows: "A small C++ subset program becomes CASL load/add/store instructions.",
    expectedResult: "C = 001E and GR0 = 001E after return.",
    suggestedActions: ["Click Assemble.", "Open Generated CASL.", "Step and watch C++ and CASL highlights move together."]
  },
  {
    id: "cpp-if-else",
    name: "C++: If Else",
    mode: "cpp",
    source: `int main() {
    int a = 10;
    int b = 10;
    int c;

    if (a == b) {
        c = 1;
    } else {
        c = 0;
    }

    return c;
}`,
    description: "Branch lowering with CPA, JZE, and JUMP.",
    whatThisShows: "C++ if/else is lowered into compare and jump instructions.",
    expectedResult: "The equality branch is taken and GR0 = 0001.",
    suggestedActions: ["Click Assemble.", "Inspect CPA / JZE / JUMP in Generated CASL.", "Step through the branch or use Run."]
  },
  {
    id: "cpp-while-sum",
    name: "C++: While Sum",
    mode: "cpp",
    source: `int main() {
    int i = 3;
    int sum = 0;

    while (i > 0) {
        sum = sum + i;
        i = i - 1;
    }

    return sum;
}`,
    description: "Loop lowering, Trace, Memory Viewer, and max-step-safe Run.",
    whatThisShows: "C++ while loop is lowered into CASL labels and conditional jumps.",
    expectedResult: "SUM = 0006 and GR0 = 0006 when the program finishes.",
    suggestedActions: ["Click Assemble.", "Open Generated CASL.", "Click Run.", "Watch Trace and Memory Viewer."]
  },
  {
    id: "cpp-for-sum",
    name: "C++: For Sum",
    mode: "cpp",
    source: `int main() {
    int sum = 0;

    for (int i = 1; i <= 3; i = i + 1) {
        sum = sum + i;
    }

    return sum;
}`,
    description: "For loop lowering into labels, conditional jumps, and a back jump.",
    whatThisShows: "C++ for loop syntax is lowered into CASL labels and jumps.",
    expectedResult: "SUM = 0006 and GR0 = 0006 when the program finishes.",
    suggestedActions: ["Click Assemble.", "Open Generated CASL.", "Open Machine Code.", "Click Run.", "Check Trace and Memory."]
  },
  {
    id: "cpp-for-sum-sugar",
    name: "C++: For Sum Sugar",
    mode: "cpp",
    source: `int main() {
    int sum = 0;

    for (int i = 1; i <= 3; i++) {
        sum += i;
    }

    return sum;
}`,
    description: "Natural for-loop syntax using i++ and += lowered to CASL.",
    whatThisShows: "Common C/C++ loop syntax sugar is normalized into assignment, add, store, and jump instructions.",
    expectedResult: "SUM = 0006 and GR0 = 0006 when the program finishes.",
    suggestedActions: ["Click Assemble.", "Open Generated CASL.", "Open Machine Code.", "Click Run.", "Confirm GR0 = 0006."]
  },
  {
    id: "cpp-break-continue",
    name: "C++: Break Continue",
    mode: "cpp",
    source: `int main() {
    int sum = 0;

    for (int i = 1; i <= 5; i++) {
        if (i == 2) {
            continue;
        }

        if (i == 4) {
            break;
        }

        sum += i;
    }

    return sum;
}`,
    description: "Break and continue lowering into CASL jumps.",
    whatThisShows: "break and continue are lowered into CASL JUMP instructions.",
    expectedResult: "SUM = 0004 and GR0 = 0004 when the program finishes.",
    suggestedActions: ["Click Assemble.", "Open Generated CASL.", "Open Machine Code.", "Step through continue and break.", "Check Trace and Memory."]
  }
];

export const DEFAULT_DEMO_PROGRAM_ID = "casl-gr2-addition";

export function getDemoProgram(id: string): DemoProgram | undefined {
  return demoPrograms.find((program) => program.id === id);
}

export function getDefaultDemoProgram(): DemoProgram {
  return getDemoProgram(DEFAULT_DEMO_PROGRAM_ID) ?? demoPrograms[0];
}
