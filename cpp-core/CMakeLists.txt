cmake_minimum_required(VERSION 3.20)

project(CASLStudioNextCore LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

option(STUGX_CASL_BUILD_WASM "Build WASM bridge" OFF)

add_library(casl_core
  src/CaslParser.cpp
  src/Assembler.cpp
  src/CometVm.cpp
  src/SourceMap.cpp
  src/InstructionSet.cpp
  src/Format.cpp
)

target_include_directories(casl_core PUBLIC include)

if(STUGX_CASL_BUILD_WASM)
  if(NOT CMAKE_SYSTEM_NAME STREQUAL "Emscripten")
    message(FATAL_ERROR "STUGX_CASL_BUILD_WASM requires the Emscripten toolchain. Use scripts/build-wasm.ps1.")
  endif()

  set(STUGX_CASL_WASM_OUTPUT_DIR "${CMAKE_SOURCE_DIR}/../public/wasm")
  file(MAKE_DIRECTORY "${STUGX_CASL_WASM_OUTPUT_DIR}")

  add_executable(stugx_casl_core wasm/wasm_bridge.cpp)
  target_link_libraries(stugx_casl_core PRIVATE casl_core)
  target_link_options(stugx_casl_core PRIVATE
    "-sMODULARIZE=1"
    "-sEXPORT_ES6=1"
    "-sENVIRONMENT=web,worker"
    "-sALLOW_MEMORY_GROWTH=1"
    "-sSTACK_SIZE=2097152"
    "-sEXPORTED_FUNCTIONS=['_stugx_casl_create','_stugx_casl_destroy','_stugx_casl_assemble','_stugx_casl_step','_stugx_casl_reset','_stugx_casl_run','_stugx_casl_get_state','_stugx_casl_get_last_error']"
    "-sEXPORTED_RUNTIME_METHODS=['ccall','cwrap','UTF8ToString','HEAPU8']"
  )
  set_target_properties(stugx_casl_core PROPERTIES
    OUTPUT_NAME "stugx_casl_core"
    SUFFIX ".js"
    RUNTIME_OUTPUT_DIRECTORY "${STUGX_CASL_WASM_OUTPUT_DIR}"
  )
else()
  enable_testing()

  add_executable(CoreSmokeTest tests/CoreSmokeTest.cpp)
  target_link_libraries(CoreSmokeTest PRIVATE casl_core)

  add_executable(core_dump tools/core_dump.cpp)
  target_link_libraries(core_dump PRIVATE casl_core)

  set(CORE_TESTS
    AssembleSimpleProgram
    AssembleChangedConstants
    AssembleChangedLabels
    DuplicateLabel_ShouldError
    AssembleInvalidRegister
    AssembleUndefinedLabel
    AssembleUnknownOpcode
    AssembleInvalidNumericLiteral
    AssembleLad
    StepLd
    StepAdda
    StepLad
    StepSuba
    StepCpaEqual
    StepCpaNegative
    StepJump
    StepJzeTaken
    StepJzeNotTaken
    StepJmiTaken
    AssembleNop
    ExecuteNopAdvancesPr
    AssembleAddlSubl
    ExecuteAddlUnsigned
    ExecuteSublUnsigned
    ExecuteAnd
    ExecuteOr
    ExecuteXor
    ExecuteCplEqual
    ExecuteCplLess
    ExecuteCplGreater
    ExecuteJovTaken
    ExecuteJovNotTaken
    AssembleShiftInstructions
    ExecuteSllBasic
    ExecuteSrlBasic
    ExecuteSlaBasic
    ExecuteSraPreservesSign
    ShiftUpdatesOverflowWhenBitShiftedOut
    ShiftCountZeroNoChange
    ShiftCountLargeLogicalStableBehavior
    ShiftCountLargeArithmeticStableBehavior
    StepStore
    StepRetFinished
    ExecuteGr2Program
    Run_ShouldStopAtMaxSteps
    MemoryAccess_OutOfRange_ShouldError
  )

  foreach(test_name IN LISTS CORE_TESTS)
    add_test(NAME ${test_name} COMMAND CoreSmokeTest ${test_name})
  endforeach()
endif()
