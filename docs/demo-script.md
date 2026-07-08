# stugx.CASL デモ録画スクリプト

このスクリプトは、前輩・先生・コンテスト審査向けに 3 分から 5 分で説明するための流れです。  
画面ではできるだけ `Generated CASL`、`Machine Code`、`Trace`、`Memory`、`Control Flow` を順番に見せます。

## 1. Opening

話す内容:

> これは `stugx.CASL` です。CASL II / COMET II を学ぶための Learning Studio です。  
> CASL を直接実行できるだけでなく、小さな C++ subset を CASL II に変換し、さらに COMET II machine code、opcode explanation、memory、trace、control flow、circuit visualization まで同じ画面で確認できます。

見せる場所:

- 左側: Source Editor
- 中央: COMET II circuit と Learning Flow
- 右側: Registers / Memory / Source Map / Trace
- 下部: Output / Generated CASL / Machine Code

## 2. Demo 1: CASL Direct Execution

選択する example:

```text
CASL: GR2 Addition
```

話す内容:

> 最初は C++ ではなく、CASL II を直接実行します。  
> `LD GR2,A` で Memory[A] を GR2 に読み込み、`ADDA GR2,B` で加算し、`ST GR2,C` で結果を Memory[C] に保存します。

操作:

1. `CASL: GR2 Addition` を選択する。
2. `Assemble` を押す。
3. `Machine Code` tab を開き、`LD`, `ADDA`, `ST`, `RET` が COMET II word になっていることを見せる。
4. `Step` を数回押す。
5. Registers で `GR2`、Memory で `C` を確認する。

期待結果:

```text
GR2 = 0007
Memory[C] = 0007
```

## 3. Demo 2: C++ to CASL to Machine Code

選択する example:

```text
C++: Addition
```

話す内容:

> 次に C++ subset の例です。これは完全な C++ compiler ではなく、学習用の小さな subset です。  
> `int a`, `int b`, `c = a + b`, `return c` が CASL II に変換されます。

操作:

1. `C++: Addition` を選択する。
2. `Assemble` を押す。
3. `Generated CASL` tab を開く。
4. `LD GR1,A`, `ADDA GR1,B`, `ST GR1,C`, `LD GR0,C`, `RET` を見せる。
5. `Machine Code` tab を開く。
6. `1010` の行をクリックし、opcode / register / operand explanation を見せる。
7. `Step` を押し、C++ 行、CASL 行、machine address、register state が連動することを見せる。

期待結果:

```text
C = 001E
GR0 = 001E
```

## 4. Demo 3: C++ For Sum Sugar

選択する example:

```text
C++: For Sum Sugar
```

話す内容:

> これは学生が自然に書きそうな `for` loop の例です。  
> `i++` と `sum += i` は、内部では通常の代入、加算、保存命令に lower されます。

操作:

1. `C++: For Sum Sugar` を選択する。
2. `Assemble` を押す。
3. `Generated CASL` tab を開く。
4. `FOR_BEGIN_0`, `FOR_BODY_0`, `FOR_CONTINUE_0`, `FOR_END_0` などの label を見せる。
5. `Machine Code` tab を開き、jump の target address と explanation を見せる。
6. `Run` を押す。
7. Trace と Memory を開いて、loop が複数回実行されたことを確認する。

期待結果:

```text
SUM = 0006
GR0 = 0006
```

## 5. Demo 4: C++ Break Continue

選択する example:

```text
C++: Break Continue
```

話す内容:

> 最後は `break` と `continue` の例です。  
> C++ の `continue` は CASL の `JUMP FOR_CONTINUE_0` に、`break` は `JUMP FOR_END_0` に変換されます。  
> つまり、制御フローは高級言語のキーワードではなく、machine code 上では PR を別の address に移動する命令として観察できます。

操作:

1. `C++: Break Continue` を選択する。
2. `Assemble` を押す。
3. `Generated CASL` tab を開く。
4. `FOR_CONTINUE_0`, `FOR_END_0`, `continue -> FOR_CONTINUE_0`, `break -> FOR_END_0` を見せる。
5. `Machine Code` tab を開く。
6. `JUMP FOR_CONTINUE_0` の word をクリックし、Control-flow target と Meaning を見せる。
7. `Run` を押す。
8. Trace tab を開き、continue / break の jump が実行履歴に出ていることを見せる。
9. Memory tab で `SUM` の値を確認する。

期待結果:

```text
SUM = 0004
GR0 = 0004
```

## 6. Closing

話す内容:

> このプロジェクトの目的は、C++ subset、CASL II assembly、COMET II machine code、runtime state を一つの画面でつなぐことです。  
> 学生は、ソースコードがどのように assembly になり、machine code になり、PR・register・memory・trace・circuit に反映されるかを確認できます。

今後の予定:

- CASL II instruction subset の拡張
- C++ subset の教育向け改善
- bit-level machine word visualization
- compact CFG graph view
- より強い source / CASL / machine code の対応表示

注意:

> 現在の C++ support は学習用 subset です。完全な C++ compiler ではありません。
