# stugx.CASL 学習デモ用スクリプト

このスクリプトは、前輩や先生に stugx.CASL の学習用途を説明するための流れです。目的は、C++ subset、CASL II、COMET II machine code、PR / GR / memory / trace / control flow / circuit の対応を見せることです。

## 1. Opening

話す内容:

> これは stugx.CASL です。CASL II / COMET II を学ぶための Learning Studio です。  
> CASL II を直接実行するだけでなく、小さな C++ subset がどのように CASL II assembly へ変換され、さらに COMET II machine code として実行されるかを確認できます。  
> 実行中は PR、GR、memory、trace、control flow、circuit を同時に観察できます。

見せる場所:

- Source Editor
- Generated CASL
- Machine Code
- Registers / Memory / Trace
- COMET II circuit

## 2. Demo 1: CASL Direct Execution

選択する example:

```text
CASL: GR2 Addition
```

話す内容:

> 最初は CASL II を直接実行します。  
> `LD GR2,A` で Memory[A] を GR2 に読み込み、`ADDA GR2,B` で加算し、`ST GR2,C` で結果を Memory[C] に保存します。

操作:

1. `CASL: GR2 Addition` を選択する。
2. `Assemble` を押す。
3. `Machine Code` を開き、`LD`, `ADDA`, `ST`, `RET` が machine word になっていることを見せる。
4. `Step` を押しながら、GR2 と Memory[C] の変化を確認する。

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
> `c = a + b;` が CASL II の `LD`, `ADDA`, `ST` に変換されます。  
> さらに Machine Code tab で、CASL II がどのような COMET II word になるか確認できます。

操作:

1. `C++: Addition` を選択する。
2. `Assemble` を押す。
3. `Generated CASL` を開き、`LD GR1,A`, `ADDA GR1,B`, `ST GR1,C` を見せる。
4. `Machine Code` を開く。
5. `1010` の行をクリックし、opcode / register / operand explanation を見せる。
6. `Step` を押し、C++ 行、CASL 行、machine address、register state が連動することを見せる。

期待結果:

```text
C = 001E
GR0 = 001E
```

## 4. Demo 3: if / else

選択する example:

```text
C++: If Else
```

話す内容:

> `if (a == b)` は CASL II の `CPA` と conditional jump に変換されます。  
> ここでは `JZE` が true 側の label にジャンプします。  
> Control Flow 表示では、jump target label と target address を確認できます。

操作:

1. `C++: If Else` を選択する。
2. `Assemble` を押す。
3. `Generated CASL` で `CPA`, `JZE`, `JUMP` を見る。
4. `Machine Code` で jump instruction をクリックし、target explanation を見る。
5. Step または Run で分岐の実行を確認する。

期待結果:

```text
GR0 = 0001
```

## 5. Demo 4: for Loop Syntax Sugar

選択する example:

```text
C++: For Sum Sugar
```

話す内容:

> `for` loop、`i++`、`sum += i` は、内部では label、comparison、jump、load/add/store に lower されます。  
> 学生が自然に書く C++ に近い形から、CASL II の構造を確認できます。

操作:

1. `C++: For Sum Sugar` を選択する。
2. `Assemble` を押す。
3. `Generated CASL` で `FOR_BEGIN`, `FOR_BODY`, `FOR_CONTINUE`, `FOR_END` を見せる。
4. `Machine Code` を開き、jump target address を確認する。
5. `Run` を押す。
6. `Trace` と `Memory` を開き、loop が複数回実行されたことを確認する。

期待結果:

```text
SUM = 0006
GR0 = 0006
```

## 6. Demo 5: break / continue

選択する example:

```text
C++: Break Continue
```

話す内容:

> `continue` は increment block にジャンプします。  
> `break` は loop end にジャンプします。  
> Machine Code 上では、どちらも通常の CASL `JUMP` instruction として確認できます。

操作:

1. `C++: Break Continue` を選択する。
2. `Assemble` を押す。
3. `Generated CASL` で `continue -> FOR_CONTINUE_0` と `break -> FOR_END_0` を見せる。
4. `Machine Code` で `JUMP FOR_CONTINUE_0` と `JUMP FOR_END_0` をクリックする。
5. `Run` を押す。
6. `Trace` を開き、continue / break の jump が実行履歴に出ていることを確認する。

期待結果:

```text
SUM = 0004
GR0 = 0004
```

## 7. Closing

話す内容:

> stugx.CASL では、C++ subset から CASL II assembly、COMET II machine code、runtime state までを一つの流れとして観察できます。  
> CASL II / COMET II を学ぶときに、ソースコード、機械語、メモリ、レジスタ、制御フロー、回路状態の関係を確認しやすくすることが目的です。

今後の学習テーマ:

- より多くの CASL II instruction
- bit-level machine word visualization
- compact CFG graph view
- source / CASL / machine code の対応表示の改善

注意:

> 現在の C++ support は学習用 subset です。完全な C++ compiler ではありません。
