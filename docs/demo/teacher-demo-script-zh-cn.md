# 教师演示脚本

- Audience: 课程教师与演示人员
- Status: Review material
- Last reviewed version: 0.1.0
- Classification: Audit material
- Related: [Final Gate](../wcasl-replacement-final-gate.md), [Getting Started](../user/getting-started.md)

建议时长 6 分钟，使用公开 Web 版 <https://stugx-casl.pages.dev/>。

## 0:00-0:40 目的

说明项目是独立、非官方的浏览器学习辅助工具，目标是让 CASL II / COMET II 的执行过程更直观。浏览器入口可降低一年级学生准备 Java 环境的门槛，但不声称复制 WCASL 的专有项目格式。

## 0:40-1:30 基本 CASL

选择内置 CASL 示例，点击 Assemble，再在 CASL Mode 中执行一次 Step Instruction。观察 Registers 与 Memory 的结果。

## 1:30-2:40 COMET Mode

切换到 COMET Mode，逐步展示 Fetch、Decode、Effective Address、Operand Read、Execute、Write Back、Flag Update 和 Complete。强调这些是实际 runtime transition，不是播放动画；Teaching Microarchitecture v1 也不代表唯一硬件实现。

## 2:40-3:30 同步观察

保持 Circuit 可见，依次选择 Registers、Memory、Code / Machine。用 `LD` 展示 Memory 到寄存器的路径和值变化，用 `ST` 展示寄存器到 Memory 的路径和目标 word。

## 3:30-4:15 Reverse

展示 Reverse Microstep 与 Reverse Instruction。确认 Trace、Machine highlight、Source Mapping、Circuit 和数据面板一起恢复。说明不能跨越 SVC、I/O、mutation、Reset、Reload 或 Full Clear。

## 4:15-5:00 IN / OUT

运行短 IN/OUT 示例。展示 WaitingInput 不会阻塞浏览器，提交输入后长度与字符进入 Memory，OUT 以纯文本显示结果。

## 5:00-5:45 多程序

分别汇编 MAIN 与 SUB module，确认 Main Module，再点击 Link Project。查看 relocation table 与带 module 上下文的 Source Mapping，逐步执行跨模块 CALL / RET。

## 5:45-6:00 收尾

请教师从课堂信息量、日文用词、课题提交和初学者操作方面提出改进意见，不要求立即在正式课程中采用。
