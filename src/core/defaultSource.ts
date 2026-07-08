export const DEFAULT_CASL_SOURCE = `MAIN START
     LD    GR1,A
     ADDA  GR1,B
     ST    GR1,C
     RET
A    DC    10
B    DC    20
C    DS    1
     END`;

export const DEFAULT_CPP_SOURCE = `int main() {
    int a = 10;
    int b = 20;
    int c;
    c = a + b;
    return c;
}`;
