# stugx.CASL デモ録画スクリプト

## 1. Opening

こんにちは。これは `stugx.CASL` です。

`stugx.CASL` は、CASL II と COMET II の動きを学習するための実行・可視化ツールです。左側でソースコードを書き、中央で COMET II の回路と実行状態を確認し、右側でレジスタ、メモリ、Source Map、Trace を追跡できます。

このデモでは、CASL を直接実行する流れと、C++ subset を CASL に変換してから COMET II 上で実行する流れを紹介します。

## 2. Demo 1: CASL direct execution

選択するサンプル:

```text
CASL: GR2 Addition
```

話すポイント:

- これは CASL II を直接実行するサンプルです。
- `LD GR2,A` で Memory[A] を GR2 に読み込みます。
- `ADDA GR2,B` で B を加算します。
- `ST GR2,C` で結果を Memory[C] に保存します。

操作:

1. `CASL: GR2 Addition` を選択します。
2. `Assemble` を押します。
3. `Step` を押しながら、GR2 と Memory[C] の変化を確認します。
4. Memory tab を開き、C の値が `0007` になることを見せます。

期待結果:

```text
GR2 = 0007
Memory[C] = 0007
```

## 3. Demo 2: C++ to CASL

選択するサンプル:

```text
C++: Addition
```

話すポイント:

- このツールは完全な C++ コンパイラではありません。
- 学習用の小さな C++ subset を CASL に変換します。
- 変換後の CASL を Generated CASL tab で確認できます。

操作:

1. `C++: Addition` を選択します。
2. `Assemble` を押します。
3. `Generated CASL` が表示されることを確認します。
4. `Step` を押し、C++ の行、CASL の行、COMET の状態が対応して動くことを見せます。

期待結果:

```text
C = 001E
GR0 = 001E
```

## 4. Demo 3: If / Else

選択するサンプル:

```text
C++: If Else
```

話すポイント:

- `if (a == b)` は CASL の `CPA` と `JZE` に変換されます。
- 条件が成立した場合は true 側のラベルにジャンプします。
- `else` 側は `JUMP` で分岐の終端に進みます。

操作:

1. `C++: If Else` を選択します。
2. `Assemble` を押します。
3. Generated CASL で `CPA`, `JZE`, `JUMP` を確認します。
4. Step または Run で分岐が実行される様子を見せます。

期待結果:

```text
GR0 = 0001
```

## 5. Demo 4: While Sum

選択するサンプル:

```text
C++: While Sum
```

話すポイント:

- `while` は CASL のループラベル、比較、条件ジャンプに変換されます。
- Trace tab ではループ中に実行された命令を追跡できます。
- Memory tab では `I`, `SUM`, `CONST_0`, `CONST_1` などの変数・定数領域を確認できます。
- Run は maxSteps で保護されているため、無限ループでもブラウザを固めません。

操作:

1. `C++: While Sum` を選択します。
2. `Assemble` を押します。
3. Generated CASL で `LOOP_BEGIN_0`, `LOOP_BODY_0`, `LOOP_END_0` を確認します。
4. Memory tab を開き、`I` と `SUM` のラベルを確認します。
5. Trace tab を開きます。
6. `Run` を押します。
7. 最後に GR0 と SUM の値が `0006` になることを確認します。

期待結果:

```text
SUM = 0006
GR0 = 0006
```

## 6. Closing

今回のデモでは、次の流れを確認しました。

```text
C++ subset source
-> Generated CASL
-> CASL assembler
-> COMET II execution
-> Register / Memory / Circuit / Trace visualization
```

今後の予定:

- CASL II 命令セットの拡張
- C++ subset の改善
- より強い可視化と学習用説明
- 必要に応じた配布・デプロイ形態の検討

この段階では、デプロイよりも学習体験と実行の正確性を優先しています。

## Appendix: Demo 5 - C++ For Sum

Select:

```text
C++: For Sum
```

Talking points:

- The `for` statement is syntax sugar in this version.
- stugx.CASL lowers it into `FOR_BEGIN_0`, `FOR_BODY_0`, `FOR_END_0`, condition jumps, increment code, and a back jump.
- Open `Generated CASL` to show the lowering.
- Open `Machine Code` to show that the generated CASL is assembled into normal COMET II words.
- Run the program and confirm:

```text
SUM = 0006
GR0 = 0006
```

Suggested actions:

1. Load `C++: For Sum`.
2. Click `Assemble`.
3. Open `Generated CASL`.
4. Open `Machine Code`.
5. Click `Run`.
6. Check `Trace`, `Memory`, and `GR0`.
## Appendix: Demo 6 - C++ For Sum Sugar

Select:

```text
C++: For Sum Sugar
```

Talking points:

- This demo uses more natural C/C++ loop syntax: `i++` and `sum += i`.
- stugx.CASL normalizes the syntax sugar into the same assignment/add/store pattern.
- Open `Generated CASL` and point out `LD`, `ADDA`, and `ST` generated from the sugar syntax.
- Open `Machine Code` and show that the words are still ordinary COMET II instructions.
- Run the program and confirm:

```text
SUM = 0006
GR0 = 0006
```

Suggested actions:

1. Load `C++: For Sum Sugar`.
2. Click `Assemble`.
3. Open `Generated CASL`.
4. Open `Machine Code`.
5. Click `Run`.
6. Check `Trace`, `Memory`, and `GR0`.